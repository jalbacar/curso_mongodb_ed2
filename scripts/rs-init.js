const replSetName = "rs0";

const desiredMembers = [
  { _id: 0, host: "mongo1:27017", priority: 2 },
  { _id: 1, host: "mongo2:27018", priority: 1 },
  { _id: 2, host: "mongo3:27019", priority: 1 }
];

function waitForAnyPrimary(timeoutSeconds) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  while (Date.now() < deadline) {
    try {
      const st = db.adminCommand({ replSetGetStatus: 1 });
      const primary = st.members.find(m => m.stateStr === "PRIMARY");
      if (primary) {
        print("PRIMARY elected:", primary.name);
        return true;
      }
    } catch (e) {}
    sleep(1000);
  }
  return false;
}

function sameTopologyAndPriority(currentCfg) {
  const cur = (currentCfg.members || []).map(m => ({
    _id: m._id,
    host: m.host,
    priority: (m.priority === undefined ? 1 : m.priority)
  })).sort((a,b) => a._id - b._id);

  const des = desiredMembers
    .map(m => ({ _id: m._id, host: m.host, priority: m.priority }))
    .sort((a,b) => a._id - b._id);

  return JSON.stringify(cur) === JSON.stringify(des);
}

// 1) Ensure initiated (idempotente)
try {
  db.adminCommand({ replSetGetStatus: 1 });
  print("Replica set already initialized.");
} catch (e) {
  print("Replica set not initialized yet. Running rs.initiate()...");
  rs.initiate({ _id: replSetName, members: desiredMembers });
}

print("Waiting for a PRIMARY...");
waitForAnyPrimary(120);

// 2) Reconfig idempotente (solo si difiere)
try {
  const cfg = rs.conf();
  if (!sameTopologyAndPriority(cfg)) {
    print("Applying rs.reconfig() to set priorities/topology...");
    cfg.members.forEach(m => {
      const desired = desiredMembers.find(d => d._id === m._id);
      if (desired) {
        m.host = desired.host;
        m.priority = desired.priority;
      }
    });
    rs.reconfig(cfg);
    print("Reconfig applied. Waiting for PRIMARY again...");
    waitForAnyPrimary(180);
  } else {
    print("Config already matches desired topology/priority. No reconfig needed.");
  }
} catch (e) {
  print("WARNING: rs.reconfig() failed (often because not on PRIMARY at that instant).");
  print("Reason:", e);
}

printjson(rs.status());
