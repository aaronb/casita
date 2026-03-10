import open from "open";
import { listCasitas } from "../docker.js";

export async function browserCommand(name: string | undefined) {
  const casitas = (await listCasitas()).filter((s) => s.state === "running");

  if (casitas.length === 0) {
    console.error("No running casitas.");
    process.exit(1);
  }

  let casita;
  if (name) {
    casita = casitas.find((s) => s.name === name);
    if (!casita) {
      console.error(`Casita "${name}" not found. Running casitas: ${casitas.map((s) => s.name).join(", ")}`);
      process.exit(1);
    }
  } else if (casitas.length === 1) {
    casita = casitas[0];
  } else {
    console.error(`Multiple casitas running. Specify a name: ${casitas.map((s) => s.name).join(", ")}`);
    process.exit(1);
  }

  const url = `http://localhost:${casita.port}/vnc.html`;
  console.log(`Opening ${url}`);
  await open(url);
}
