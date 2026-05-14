import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import fs from "node:fs";
import path from "node:path";

function readDefaultProjectId() {
  const rcPath = path.resolve(process.cwd(), ".firebaserc");

  if (!fs.existsSync(rcPath)) {
    return undefined;
  }

  try {
    const config = JSON.parse(fs.readFileSync(rcPath, "utf8"));
    return config.projects?.default;
  } catch {
    return undefined;
  }
}

function parseArgs(argv) {
  const args = {
    command: argv[2] ?? "help",
  };

  for (let index = 3; index < argv.length; index += 1) {
    const item = argv[index];

    if (!item.startsWith("--")) {
      continue;
    }

    const key = item.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

function printHelp() {
  console.log(`
Uso:
  npm run admin:upgrade:list
  npm run admin:upgrade:approve -- --request <requestId>
  npm run admin:upgrade:reject -- --request <requestId> --reason "motivo opcional"

Credenciais:
  Defina GOOGLE_APPLICATION_CREDENTIALS com o caminho do JSON da service account.

Seguranca:
  Este script usa Firebase Admin SDK e deve rodar apenas localmente por quem administra o projeto.
`);
}

function initializeAdmin() {
  if (getApps().length > 0) {
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || readDefaultProjectId();
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (credentialsPath && fs.existsSync(credentialsPath)) {
    initializeApp({
      credential: cert(JSON.parse(fs.readFileSync(credentialsPath, "utf8"))),
      projectId,
    });
    return;
  }

  initializeApp({
    credential: applicationDefault(),
    projectId,
  });
}

function formatRequest(id, data) {
  return [
    `ID: ${id}`,
    `  usuario: ${data.nome ?? "sem nome"} <${data.email ?? "sem email"}>`,
    `  userId: ${data.userId ?? "sem userId"}`,
    `  plano atual: ${data.planoAtual ?? "indefinido"}`,
    `  solicitado: ${data.planoSolicitado ?? "indefinido"}`,
    `  status: ${data.status ?? "indefinido"}`,
    `  criado em: ${data.createdAt?.toDate?.().toLocaleString("pt-BR") ?? "sem data"}`,
  ].join("\n");
}

async function listPendingRequests(db) {
  const snapshot = await db
    .collection("upgradeRequests")
    .where("status", "==", "pending")
    .get();

  if (snapshot.empty) {
    console.log("Nenhuma solicitacao Pro pendente.");
    return;
  }

  console.log(`Solicitacoes Pro pendentes: ${snapshot.size}\n`);
  const sortedDocs = [...snapshot.docs].sort((left, right) => {
    const leftTime = left.data().createdAt?.toMillis?.() ?? 0;
    const rightTime = right.data().createdAt?.toMillis?.() ?? 0;
    return rightTime - leftTime;
  });

  sortedDocs.forEach((documentSnapshot) => {
    console.log(formatRequest(documentSnapshot.id, documentSnapshot.data()));
    console.log("");
  });
}

async function approveRequest(db, requestId) {
  if (!requestId) {
    throw new Error("Informe --request <requestId>.");
  }

  await db.runTransaction(async (transaction) => {
    const requestRef = db.collection("upgradeRequests").doc(requestId);
    const requestSnapshot = await transaction.get(requestRef);

    if (!requestSnapshot.exists) {
      throw new Error(`Solicitacao ${requestId} nao encontrada.`);
    }

    const request = requestSnapshot.data();

    if (request.status !== "pending") {
      throw new Error(`Solicitacao ${requestId} nao esta pendente.`);
    }

    if (!request.userId) {
      throw new Error(`Solicitacao ${requestId} nao tem userId.`);
    }

    const userRef = db.collection("users").doc(request.userId);
    const userSnapshot = await transaction.get(userRef);

    if (!userSnapshot.exists) {
      throw new Error(`Usuario ${request.userId} nao encontrado.`);
    }

    transaction.update(userRef, {
      plano: "pro",
      updatedAt: FieldValue.serverTimestamp(),
    });

    transaction.update(requestRef, {
      status: "approved",
      approvedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  console.log(`Solicitacao ${requestId} aprovada. Usuario liberado como Pro.`);
}

async function rejectRequest(db, requestId, reason) {
  if (!requestId) {
    throw new Error("Informe --request <requestId>.");
  }

  const requestRef = db.collection("upgradeRequests").doc(requestId);
  const requestSnapshot = await requestRef.get();

  if (!requestSnapshot.exists) {
    throw new Error(`Solicitacao ${requestId} nao encontrada.`);
  }

  const request = requestSnapshot.data();

  if (request.status !== "pending") {
    throw new Error(`Solicitacao ${requestId} nao esta pendente.`);
  }

  await requestRef.update({
    status: "rejected",
    rejectionReason: reason || null,
    rejectedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(`Solicitacao ${requestId} rejeitada.`);
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.command === "help" || args.command === "--help") {
    printHelp();
    return;
  }

  initializeAdmin();
  const db = getFirestore();

  if (args.command === "list") {
    await listPendingRequests(db);
    return;
  }

  if (args.command === "approve") {
    await approveRequest(db, args.request);
    return;
  }

  if (args.command === "reject") {
    await rejectRequest(db, args.request, args.reason);
    return;
  }

  printHelp();
  throw new Error(`Comando desconhecido: ${args.command}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
