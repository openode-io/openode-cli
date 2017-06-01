function out(msg) {
  const date = new Date();
  console.log("[" + date + "] - ", msg);
}

function err(msg) {
  const date = new Date();
  console.error("[" + date + "] - ", msg);
}

module.exports = {
  out,
  err
}
