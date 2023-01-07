export default (toEncode: string) =>
  Buffer.from(toEncode, "utf8").toString("base64");
