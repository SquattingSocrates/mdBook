const http = require("http");
const cp = require("child_process");
const fs = require("fs/promises");
const path = require("path");

const hostname = "127.0.0.1";
const port = 4000;
let run = 0;

const runScript = async(script) => {
    console.log("RUNNING SCRIPT");
    const tmpDir = await fs.mkdtemp(`run_${run++}`);
    const nuFile = path.resolve(tmpDir, "./script.js");
    await fs.writeFile(nuFile, script);
    return new Promise((resolve, reject) => {
        cp.exec(`node ${nuFile}`, {}, (err, stdout, stderr) =>
            resolve({ stderr: stderr || err || "", stdout })
        );
    }).finally(() => {
        fs.rm(tmpDir, { recursive: true, force: true }).catch((err) =>
            console.error("Failed to remove tmpDir", tmpdir, err)
        );
    });
};

const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
    );
    try {
        if (req.url.endsWith("/run_nodejs") && req.method === "POST") {
            let script = "";
            req.on("data", (chunk) => {
                script += chunk;
            });
            req.on("end", () => {
                let data;
                try {
                    data = JSON.parse(script);
                } catch (err) {
                    console.error("Failed to parse data", err, script);
                    res.statusCode = 400;
                    res.setHeader("Content-Type", "application/json");
                    res.end(
                        JSON.stringify({
                            error: `Failed to parse request: ${err.toString()}`,
                        })
                    );
                    return;
                }
                runScript(data.code)
                    .then((result) => {
                        console.log("GOT RESULT", result);
                        res.statusCode = 200;
                        res.setHeader("Content-Type", "application/json");
                        res.end(JSON.stringify({ result }));
                    })
                    .catch((error) => {
                        console.error("Failed to run script", error);
                        res.statusCode = 400;
                        res.setHeader("Content-Type", "application/json");
                        res.end(JSON.stringify(error));
                    });
            });
        } else {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ data: "Hello World" }));
        }
    } catch (err) {
        console.error("Something bad happened", err);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Something went horribly wrong" }));
    }
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});