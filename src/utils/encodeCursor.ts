import base64 from "./base64";

export default (cursor: string) => base64(`arrayconnection:${cursor}`);
