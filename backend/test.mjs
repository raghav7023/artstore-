import dns from "node:dns";

dns.resolveSrv(
    "_mongodb._tcp.heavy-duty.s0xjzpc.mongodb.net",
    (err, records) => {
        console.log("Error:", err);
        console.log("Records:", records);
    }
);