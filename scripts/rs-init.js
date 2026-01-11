const replSetName = "rs0";

const cfg = {
  _id: replSetName,
  members: [
    { _id: 0, host: "mongo1:27017" },
    { _id: 1, host: "mongo2:27018" },
    { _id: 2, host: "mongo3:27019" }
  ]
};

function waitForAnyPrimary(timeoutSeconds) {
  const deadline = Date.now() + timeoutSeconds * 1000;

  while (Date.now() < deadline) {
    try {
      const st = db.adminCommand({ replSetGetStatus: 1 }); // replSetGetStatus
      const primary = st.members.find(m => m.stateStr === "PRIMARY");
      if (primary) {
        print("PRIMARY elected:", primary.name);
        return true;
      }
    } catch (e) {
      // Not ready yet (startup / init race). Keep waiting.
    }
    sleep(1000);
  }
  return false;
}

// 1) Idempotent init
try {
  const st = db.adminCommand({ replSetGetStatus: 1 });
  print("Replica set already initialized. Current set:", st.set);
} catch (e) {
  print("Replica set not initialized yet. Running rs.initiate()...");
  try {
    rs.initiate(cfg);
  } catch (e2) {
    const msg = (e2 && e2.message) ? e2.message : String(e2);
    if (!msg.includes("AlreadyInitialized") && !msg.includes("already initialized")) {
      throw e2;
    }
    print("Replica set was initialized by another attempt. Continuing...");
  }
}

// 2) Wait for election to settle (any node can become PRIMARY)
print("Waiting for a PRIMARY in the set...");
if (!waitForAnyPrimary(90)) {
  print("WARNING: Timed out waiting for PRIMARY; showing rs.status() for debugging");
}

printjson(rs.status());
