"use client";

import type { User } from "firebase/auth";
import {
  Timestamp,
  arrayRemove,
  arrayUnion,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { colorFromSeed, initialsFromName } from "@/lib/avatar";
import { db } from "@/lib/firebase";
import { canCreateActiveCaixa } from "@/lib/plano";
import type {
  Caixa,
  CaixaBackupPayload,
  CaixaMembro,
  CaixaNota,
  CaixaPagamento,
  CaixaResumo,
  Convite,
  CreateCaixaInput,
  PagamentoStatus,
  UserProfile,
} from "@/lib/types";

function parseDoc<T>(snapshot: { id: string; data: () => unknown }) {
  return {
    id: snapshot.id,
    ...(snapshot.data() as T),
  } as T & { id: string };
}

function paymentMedalFromDate(date: Date): "ouro" | "prata" | "bronze" {
  const day = date.getDate();

  if (day <= 5) {
    return "ouro";
  }

  if (day <= 10) {
    return "prata";
  }

  return "bronze";
}

function sortMembersForSchedule(membros: CaixaMembro[]) {
  return [...membros].sort((a, b) => {
    const aTime = a.entradaEm?.toMillis?.() ?? 0;
    const bTime = b.entradaEm?.toMillis?.() ?? 0;

    if (aTime !== bTime) {
      return aTime - bTime;
    }

    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}

function timestampToIso(value: Timestamp | null | undefined) {
  return value?.toDate?.().toISOString() ?? null;
}

function isoToTimestamp(value: string | null | undefined) {
  return value ? Timestamp.fromDate(new Date(value)) : null;
}

export async function ensureUserProfile(user: User, nome?: string) {
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      nome: nome ?? user.displayName ?? user.email?.split("@")[0] ?? "Usuario",
      email: user.email?.toLowerCase() ?? "",
      fotoUrl: user.photoURL,
      cor: colorFromSeed(user.uid),
      plano: "free",
      chavePix: null,
      tipoChavePix: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return;
  }

  const current = snapshot.data() as UserProfile;
  const updates: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (!current.nome && (nome || user.displayName)) {
    updates.nome = nome ?? user.displayName;
  }

  const normalizedEmail = user.email?.toLowerCase() ?? "";

  if (normalizedEmail && current.email !== normalizedEmail) {
    updates.email = normalizedEmail;
  }

  if (!current.fotoUrl && user.photoURL) {
    updates.fotoUrl = user.photoURL;
  }

  if (!current.cor) {
    updates.cor = colorFromSeed(user.uid);
  }

  if (Object.keys(updates).length > 1) {
    await updateDoc(userRef, updates);
  }
}

export function subscribeUserProfile(
  userId: string,
  callback: (profile: UserProfile | null) => void,
) {
  return onSnapshot(doc(db, "users", userId), (snapshot) => {
    callback(snapshot.exists() ? (snapshot.data() as UserProfile) : null);
  });
}

export async function createCaixa(
  input: CreateCaixaInput,
  profile: UserProfile,
  gerenteId: string,
) {
  const limit = canCreateActiveCaixa(profile.plano, 0);

  if (!limit.allowed) {
    throw new Error(
      "Seu plano Free permite apenas 1 caixa ativo. Encerre o atual ou faca upgrade para Pro.",
    );
  }

  const caixaRef = doc(collection(db, "caixas"));
  const linkConvite = crypto.randomUUID().replaceAll("-", "");

  await setDoc(caixaRef, {
    id: caixaRef.id,
    nome: input.nome,
    descricao: input.descricao,
    gerenteId,
    gerenteEmail: profile.email,
    valorMensal: input.valorMensal,
    totalPorMes: input.valorMensal * input.totalMeses,
    totalMeses: input.totalMeses,
    mesAtual: 1,
    status: "ativo",
    origem: "novo",
    dataInicio: Timestamp.fromDate(new Date(`${input.dataInicio}T12:00:00`)),
    linkConvite,
    linkExpiraEm: null,
    rankingAtivo: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await setDoc(
    doc(db, "painel_index", gerenteId),
    {
      gerencia: arrayUnion(caixaRef.id),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await syncInviteSummary(caixaRef.id);

  return {
    id: caixaRef.id,
    nome: input.nome,
    descricao: input.descricao,
    gerenteId,
    gerenteEmail: profile.email,
    valorMensal: input.valorMensal,
    totalPorMes: input.valorMensal * input.totalMeses,
    totalMeses: input.totalMeses,
    mesAtual: 1,
    status: "ativo",
    origem: "novo",
    dataInicio: Timestamp.fromDate(new Date(`${input.dataInicio}T12:00:00`)),
    linkConvite,
    linkExpiraEm: null,
    rankingAtivo: true,
    createdAt: null,
    updatedAt: null,
    membrosAtivos: 0,
  } satisfies CaixaResumo;
}

async function mergePainelIndex(userId: string, payload: Record<string, unknown>) {
  await setDoc(
    doc(db, "painel_index", userId),
    {
      ...payload,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

async function syncInviteSummary(caixaId: string) {
  const caixaSnapshot = await getDoc(doc(db, "caixas", caixaId));

  if (!caixaSnapshot.exists()) {
    throw new Error("Caixa nao encontrado para sincronizar convite.");
  }

  const caixa = caixaSnapshot.data() as Caixa;
  const gerenteSnapshot = await getDoc(doc(db, "users", caixa.gerenteId));
  const gerente = gerenteSnapshot.exists() ? (gerenteSnapshot.data() as UserProfile) : null;
  const membrosSnapshot = await getDocs(collection(db, "caixas", caixaId, "membros"));
  const membros = membrosSnapshot.docs.map((snapshot) => snapshot.data() as CaixaMembro);

  await setDoc(
    doc(db, "convites", caixa.linkConvite),
    {
      token: caixa.linkConvite,
      caixaId,
      criadoPor: caixa.gerenteId,
      convidadoUserId: null,
      emailDestino: null,
      caixaNome: caixa.nome,
      gerenteNome: gerente?.nome ?? "Gerente",
      valorMensal: caixa.valorMensal,
      totalPorMes: caixa.totalPorMes,
      totalMeses: caixa.totalMeses,
      mesAtual: caixa.mesAtual,
      membrosConfirmados: membros.filter((membro) => membro.status === "ativo").length,
      membrosPreview: membros.slice(0, 6).map((membro) => ({
        cor: membro.cor,
        iniciais: initialsFromName(membro.nome),
      })),
      usoUnico: false,
      usosRestantes: null,
      expiraEm: caixa.linkExpiraEm,
      status: "ativo",
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function syncPainelIndexForUser(user: User) {
  const normalizedEmail = user.email?.trim().toLowerCase();
  const gerencia = new Set<string>();
  const participa = new Set<string>();

  const managedByUid = await getDocs(query(collection(db, "caixas"), where("gerenteId", "==", user.uid)));
  managedByUid.docs.forEach((snapshot) => {
    gerencia.add(snapshot.id);
  });

  if (normalizedEmail) {
    const managedByEmail = await getDocs(
      query(collection(db, "caixas"), where("gerenteEmail", "==", normalizedEmail)),
    );
    managedByEmail.docs.forEach((snapshot) => {
      gerencia.add(snapshot.id);
    });

    const memberByEmail = await getDocs(
      query(collectionGroup(db, "membros"), where("email", "==", normalizedEmail)),
    );
    memberByEmail.docs.forEach((snapshot) => {
      const caixaId = snapshot.ref.parent.parent?.id;

      if (caixaId) {
        participa.add(caixaId);
      }
    });
  }

  const memberByUid = await getDocs(
    query(collectionGroup(db, "membros"), where("userId", "==", user.uid)),
  );
  memberByUid.docs.forEach((snapshot) => {
    const caixaId = snapshot.ref.parent.parent?.id;

    if (caixaId) {
      participa.add(caixaId);
    }
  });

  await mergePainelIndex(user.uid, {
    gerencia: Array.from(gerencia),
    participa: Array.from(participa),
  });
}

async function buildCaixaResumo(caixa: Caixa) {
  const membrosSnapshot = await getDocs(collection(db, "caixas", caixa.id, "membros"));
  const membrosAtivos = membrosSnapshot.docs.filter(
    (membro) => (membro.data() as CaixaMembro).status === "ativo",
  ).length;

  return {
    ...caixa,
    membrosAtivos,
  } satisfies CaixaResumo;
}

export function subscribeManagedCaixas(
  userId: string,
  callback: (caixas: CaixaResumo[]) => void,
) {
  return onSnapshot(
    doc(db, "painel_index", userId),
    async (snapshot) => {
      const data = snapshot.data() as { gerencia?: string[] } | undefined;
      const caixaIds = data?.gerencia ?? [];

      if (caixaIds.length === 0) {
        callback([]);
        return;
      }

      const caixas = await Promise.all(
        caixaIds.map(async (caixaId): Promise<CaixaResumo | null> => {
          const caixaSnapshot = await getDoc(doc(db, "caixas", caixaId));

          if (!caixaSnapshot.exists()) {
            return null;
          }

          return buildCaixaResumo(parseDoc<Caixa>(caixaSnapshot));
        }),
      );

      callback(
        caixas
          .filter((caixa): caixa is CaixaResumo => caixa !== null)
          .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)),
      );
    },
    (error) => {
      // eslint-disable-next-line no-console
      console.error("Falha ao listar caixas gerenciados pelo painel_index.", error);
    },
  );
}

export function subscribeMemberCaixas(
  userId: string,
  callback: (caixas: CaixaResumo[]) => void,
) {
  return onSnapshot(
    doc(db, "painel_index", userId),
    async (snapshot) => {
      const data = snapshot.data() as { participa?: string[] } | undefined;
      const caixaIds = data?.participa ?? [];

      if (caixaIds.length === 0) {
        callback([]);
        return;
      }

      const caixas = await Promise.all(
        caixaIds.map(async (caixaId) => {
          const caixaSnapshot = await getDoc(doc(db, "caixas", caixaId));

          if (!caixaSnapshot.exists()) {
            return null;
          }

          const caixa = parseDoc<Caixa>(caixaSnapshot);
          const membrosSnapshot = await getDocs(collection(db, "caixas", caixa.id, "membros"));
          const pagamentosSnapshot = await getDocs(collection(db, "caixas", caixa.id, "pagamentos"));

          const myPayment = pagamentosSnapshot.docs
            .map((payment) => payment.data() as CaixaPagamento)
            .find((payment) => payment.membroId === userId && payment.mes === caixa.mesAtual);

          return {
            ...caixa,
            membrosAtivos: membrosSnapshot.docs.filter(
              (membroSnapshot) => (membroSnapshot.data() as CaixaMembro).status === "ativo",
            ).length,
            meuStatusNoMes: myPayment?.status ?? "nao_iniciado",
          } satisfies CaixaResumo;
        }),
      );

      const caixasValidos = caixas.filter(Boolean) as CaixaResumo[];

      callback(
        caixasValidos.sort(
          (a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
        ),
      );
    },
    (error) => {
      // eslint-disable-next-line no-console
      console.error("Falha ao listar caixas de membro pelo painel_index.", error);
    },
  );
}

export function subscribeCaixa(caixaId: string, callback: (caixa: Caixa | null) => void) {
  return onSnapshot(doc(db, "caixas", caixaId), (snapshot) => {
    callback(snapshot.exists() ? (snapshot.data() as Caixa) : null);
  });
}

export function subscribeCaixaMembros(
  caixaId: string,
  callback: (membros: CaixaMembro[]) => void,
) {
  return onSnapshot(collection(db, "caixas", caixaId, "membros"), (snapshot) => {
    callback(
      snapshot.docs
        .map((docSnapshot) => docSnapshot.data() as CaixaMembro)
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    );
  });
}

export function subscribeCaixaPagamentos(
  caixaId: string,
  callback: (pagamentos: CaixaPagamento[]) => void,
) {
  return onSnapshot(collection(db, "caixas", caixaId, "pagamentos"), (snapshot) => {
    callback(snapshot.docs.map((docSnapshot) => docSnapshot.data() as CaixaPagamento));
  });
}

export function subscribeCaixaNotas(caixaId: string, callback: (notas: CaixaNota[]) => void) {
  return onSnapshot(collection(db, "caixas", caixaId, "notas"), (snapshot) => {
    callback(
      snapshot.docs
        .map((docSnapshot) => docSnapshot.data() as CaixaNota)
        .sort((a, b) => a.mes - b.mes),
    );
  });
}

export function subscribeCaixaConvites(caixaId: string, callback: (convites: Convite[]) => void) {
  return onSnapshot(
    query(
      collection(db, "convites"),
      where("caixaId", "==", caixaId),
      where("status", "==", "ativo"),
    ),
    (snapshot) => {
      callback(
        snapshot.docs
          .map((docSnapshot) => docSnapshot.data() as Convite)
          .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)),
      );
    },
  );
}

export function subscribePendingInvitesByEmail(
  email: string,
  callback: (convites: Convite[]) => void,
) {
  const normalizedEmail = email.trim().toLowerCase();

  return onSnapshot(
    query(
      collection(db, "convites"),
      where("emailDestino", "==", normalizedEmail),
      where("status", "==", "ativo"),
    ),
    (snapshot) => {
      callback(
        snapshot.docs
          .map((docSnapshot) => docSnapshot.data() as Convite)
          .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)),
      );
    },
    (error) => {
      // eslint-disable-next-line no-console
      console.error("Falha ao listar convites pendentes por email.", error);
    },
  );
}

export async function getInviteByToken(token: string) {
  const inviteSnapshot = await getDoc(doc(db, "convites", token));

  if (!inviteSnapshot.exists()) {
    const caixasSnapshot = await getDocs(
      query(collection(db, "caixas"), where("linkConvite", "==", token)),
    );

    if (caixasSnapshot.empty) {
      return null;
    }

    const caixa = parseDoc<Caixa>(caixasSnapshot.docs[0]);
    const gerenteSnapshot = await getDoc(doc(db, "users", caixa.gerenteId));
    const gerente = gerenteSnapshot.exists() ? (gerenteSnapshot.data() as UserProfile) : null;
    const membrosSnapshot = await getDocs(collection(db, "caixas", caixa.id, "membros"));
    const membros = membrosSnapshot.docs.map((snapshot) => snapshot.data() as CaixaMembro);

    return {
      token,
      caixaId: caixa.id,
      criadoPor: caixa.gerenteId,
      convidadoUserId: null,
      emailDestino: null,
      caixaNome: caixa.nome,
      gerenteNome: gerente?.nome ?? "Gerente",
      valorMensal: caixa.valorMensal,
      totalPorMes: caixa.totalPorMes,
      totalMeses: caixa.totalMeses,
      mesAtual: caixa.mesAtual,
      membrosConfirmados: membros.filter((membro) => membro.status === "ativo").length,
      membrosPreview: membros.slice(0, 6).map((membro) => ({
        cor: membro.cor,
        iniciais: initialsFromName(membro.nome),
      })),
      usoUnico: false,
      usosRestantes: null,
      expiraEm: caixa.linkExpiraEm,
      status: "ativo" as const,
      createdAt: caixa.createdAt,
    } satisfies Convite;
  }

  return inviteSnapshot.data() as Convite;
}

export async function acceptInvite(token: string, user: User, profile: UserProfile) {
  const invite = await getInviteByToken(token);

  if (!invite || invite.status !== "ativo") {
    throw new Error("Esse convite nao esta mais disponivel.");
  }
  const normalizedEmail = profile.email.trim().toLowerCase();
  const totalMeses = invite.totalMeses ?? null;

  if (invite.emailDestino && invite.emailDestino !== normalizedEmail) {
    throw new Error("Esse convite foi enviado para outro email.");
  }

  if (!totalMeses) {
    throw new Error("Esse convite esta incompleto. Gere um novo link e tente novamente.");
  }

  const memberRef = doc(db, "caixas", invite.caixaId, "membros", normalizedEmail);
  const existingMember = await getDoc(memberRef);

  if (!existingMember.exists()) {
    const activeMembers = invite.membrosConfirmados ?? 0;

    if (activeMembers >= totalMeses) {
      throw new Error("Esse caixa ja atingiu o numero total de membros configurado.");
    }

    await setDoc(memberRef, {
      userId: user.uid,
      email: normalizedEmail,
      nome: profile.nome,
      fotoUrl: profile.fotoUrl,
      cor: profile.cor || colorFromSeed(user.uid),
      ordemSorteio: null,
      mesRecebimento: null,
      entradaEm: serverTimestamp(),
      status: "ativo",
      substituidoPor: null,
    });
  }

  await mergePainelIndex(user.uid, {
    participa: arrayUnion(invite.caixaId),
  });

  await setDoc(
    doc(db, "convites", token),
    {
      convidadoUserId: user.uid,
      status: "aceito",
      createdAt: invite.createdAt ?? serverTimestamp(),
    },
    { merge: true },
  );

  await syncInviteSummary(invite.caixaId);

  return {
    caixaId: invite.caixaId,
    caixaNome: invite.caixaNome ?? "seu caixa",
  };
}

export async function cancelInviteByToken(token: string) {
  const inviteRef = doc(db, "convites", token);
  const inviteSnapshot = await getDoc(inviteRef);

  if (!inviteSnapshot.exists()) {
    throw new Error("Esse convite ja nao existe mais.");
  }

  await updateDoc(inviteRef, {
    status: "revogado",
  });
}

export async function regeneratePublicInviteLink(caixaId: string) {
  const caixaRef = doc(db, "caixas", caixaId);
  const caixaSnapshot = await getDoc(caixaRef);

  if (!caixaSnapshot.exists()) {
    throw new Error("Caixa nao encontrado.");
  }

  const caixa = caixaSnapshot.data() as Caixa;
  const previousToken = caixa.linkConvite;
  const nextToken = crypto.randomUUID().replaceAll("-", "");

  await updateDoc(caixaRef, {
    linkConvite: nextToken,
    updatedAt: serverTimestamp(),
  });

  const previousInviteRef = doc(db, "convites", previousToken);
  const previousInviteSnapshot = await getDoc(previousInviteRef);

  if (previousInviteSnapshot.exists()) {
    await updateDoc(previousInviteRef, {
      status: "revogado",
    });
  }

  await syncInviteSummary(caixaId);

  return nextToken;
}

export async function removeMemberFromCaixa(caixaId: string, membro: CaixaMembro) {
  const memberEmail = membro.email?.trim().toLowerCase();

  if (!memberEmail) {
    throw new Error("Nao foi possivel identificar o email deste membro.");
  }

  await deleteDoc(doc(db, "caixas", caixaId, "membros", memberEmail));

  if (membro.userId) {
    await setDoc(
      doc(db, "painel_index", membro.userId),
      {
        participa: arrayRemove(caixaId),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  await syncInviteSummary(caixaId);
}

export async function deleteCaixaCompletely(caixaId: string) {
  const caixaRef = doc(db, "caixas", caixaId);
  const caixaSnapshot = await getDoc(caixaRef);

  if (!caixaSnapshot.exists()) {
    throw new Error("Caixa nao encontrado.");
  }

  const caixa = caixaSnapshot.data() as Caixa;
  const membersSnapshot = await getDocs(collection(db, "caixas", caixaId, "membros"));
  const paymentsSnapshot = await getDocs(collection(db, "caixas", caixaId, "pagamentos"));
  const notesSnapshot = await getDocs(collection(db, "caixas", caixaId, "notas"));
  const invitesSnapshot = await getDocs(
    query(collection(db, "convites"), where("caixaId", "==", caixaId)),
  );

  await Promise.all(
    membersSnapshot.docs.map(async (memberDoc) => {
      const membro = memberDoc.data() as CaixaMembro;
      await deleteDoc(memberDoc.ref);

      if (membro.userId) {
        await setDoc(
          doc(db, "painel_index", membro.userId),
          {
            participa: arrayRemove(caixaId),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }
    }),
  );

  await Promise.all([
    ...paymentsSnapshot.docs.map((paymentDoc) => deleteDoc(paymentDoc.ref)),
    ...notesSnapshot.docs.map((noteDoc) => deleteDoc(noteDoc.ref)),
    ...invitesSnapshot.docs.map((inviteDoc) => deleteDoc(inviteDoc.ref)),
  ]);

  await setDoc(
    doc(db, "painel_index", caixa.gerenteId),
    {
      gerencia: arrayRemove(caixaId),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await deleteDoc(caixaRef);
}

export async function saveCaixaNota(
  caixaId: string,
  mes: number,
  texto: string,
  gerenteId: string,
) {
  const cleanText = texto.trim();

  if (!cleanText) {
    throw new Error("Escreva uma nota antes de salvar.");
  }

  await setDoc(
    doc(db, "caixas", caixaId, "notas", String(mes)),
    {
      id: String(mes),
      mes,
      texto: cleanText,
      criadoPor: gerenteId,
      criadoEm: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function deleteCaixaNota(caixaId: string, notaId: string) {
  await deleteDoc(doc(db, "caixas", caixaId, "notas", notaId));
}

export async function addMemberToCaixa(caixaId: string, email: string) {
  const caixaRef = doc(db, "caixas", caixaId);
  const caixaSnapshot = await getDoc(caixaRef);

  if (!caixaSnapshot.exists()) {
    throw new Error("Caixa nao encontrado.");
  }

  const caixa = caixaSnapshot.data() as Caixa;
  const normalizedEmail = email.trim().toLowerCase();
  const membersSnapshot = await getDocs(collection(db, "caixas", caixaId, "membros"));
  const activeMembers = membersSnapshot.docs.filter(
    (snapshot) => (snapshot.data() as CaixaMembro).status === "ativo",
  ).length;
  const memberRef = doc(db, "caixas", caixaId, "membros", normalizedEmail);
  const existingMember = await getDoc(memberRef);

  if (existingMember.exists()) {
    throw new Error("Esse usuario ja participa deste caixa.");
  }

  if (activeMembers >= caixa.totalMeses) {
    throw new Error("Esse caixa ja atingiu o numero total de membros configurado.");
  }

  const existingInvites = await getDocs(
    query(
      collection(db, "convites"),
      where("caixaId", "==", caixaId),
      where("emailDestino", "==", normalizedEmail),
      where("status", "==", "ativo"),
    ),
  );

  if (!existingInvites.empty) {
    return {
      status: "invited" as const,
      email: normalizedEmail,
    };
  }

  const gerenteSnapshot = await getDoc(doc(db, "users", caixa.gerenteId));
  const gerente = gerenteSnapshot.exists() ? (gerenteSnapshot.data() as UserProfile) : null;
  const inviteRef = doc(collection(db, "convites"));

  await setDoc(inviteRef, {
    token: inviteRef.id,
    caixaId,
    criadoPor: caixa.gerenteId,
    convidadoUserId: null,
    emailDestino: normalizedEmail,
    caixaNome: caixa.nome,
    gerenteNome: gerente?.nome ?? null,
    valorMensal: caixa.valorMensal,
    totalPorMes: caixa.totalPorMes,
    totalMeses: caixa.totalMeses,
    mesAtual: caixa.mesAtual,
    membrosConfirmados: activeMembers,
    membrosPreview: membersSnapshot.docs
      .map((snapshot) => snapshot.data() as CaixaMembro)
      .slice(0, 6)
      .map((membro) => ({
        cor: membro.cor,
        iniciais: initialsFromName(membro.nome),
      })),
    usoUnico: false,
    usosRestantes: null,
    expiraEm: null,
    status: "ativo",
    createdAt: serverTimestamp(),
  });

  await syncInviteSummary(caixaId);

  return {
    status: "invited" as const,
    email: normalizedEmail,
  };
}

export async function declarePagamento(
  caixaId: string,
  caixa: Caixa,
  userId: string,
  valor: number,
) {
  const paymentId = `${userId}_${caixa.mesAtual}`;
  const paymentRef = doc(db, "caixas", caixaId, "pagamentos", paymentId);
  const paymentSnapshot = await getDoc(paymentRef);

  if (paymentSnapshot.exists()) {
    const currentPayment = paymentSnapshot.data() as CaixaPagamento;

    if (currentPayment.status !== "rejeitado") {
      throw new Error("Seu pagamento deste mes ja foi marcado.");
    }
  }

  await setDoc(paymentRef, {
    id: paymentId,
    membroId: userId,
    mes: caixa.mesAtual,
    valor,
    status: "pendente" satisfies PagamentoStatus,
    declaradoEm: serverTimestamp(),
    confirmadoEm: null,
    confirmadoPor: null,
    motivoRejeicao: null,
    comprovante: null,
    fonte: "app",
    pontuacaoPontualidade: null,
  });
}

export async function confirmPagamento(
  caixaId: string,
  pagamento: CaixaPagamento,
  gerenteId: string,
) {
  await updateDoc(doc(db, "caixas", caixaId, "pagamentos", pagamento.id), {
    status: "confirmado" satisfies PagamentoStatus,
    confirmadoEm: serverTimestamp(),
    confirmadoPor: gerenteId,
    motivoRejeicao: null,
    pontuacaoPontualidade: paymentMedalFromDate(new Date()),
  });
}

export async function rejectPagamento(
  caixaId: string,
  pagamento: CaixaPagamento,
  gerenteId: string,
  motivo?: string,
) {
  await updateDoc(doc(db, "caixas", caixaId, "pagamentos", pagamento.id), {
    status: "rejeitado" satisfies PagamentoStatus,
    confirmadoEm: serverTimestamp(),
    confirmadoPor: gerenteId,
    motivoRejeicao: motivo?.trim() || null,
    pontuacaoPontualidade: null,
  });
}

export async function markPagamentoByManager(
  caixaId: string,
  caixa: Caixa,
  membro: CaixaMembro,
  gerenteId: string,
) {
  const paymentId = `${membro.userId}_${caixa.mesAtual}`;
  const paymentRef = doc(db, "caixas", caixaId, "pagamentos", paymentId);
  const paymentSnapshot = await getDoc(paymentRef);

  if (paymentSnapshot.exists()) {
    throw new Error("Ja existe um registro de pagamento para esse membro neste mes.");
  }

  await setDoc(paymentRef, {
    id: paymentId,
    membroId: membro.userId,
    mes: caixa.mesAtual,
    valor: caixa.valorMensal,
    status: "confirmado" satisfies PagamentoStatus,
    declaradoEm: serverTimestamp(),
    confirmadoEm: serverTimestamp(),
    confirmadoPor: gerenteId,
    motivoRejeicao: null,
    comprovante: null,
    fonte: "app",
    pontuacaoPontualidade: paymentMedalFromDate(new Date()),
  });
}

export async function prepareCaixaSchedule(caixaId: string) {
  const caixaSnapshot = await getDoc(doc(db, "caixas", caixaId));

  if (!caixaSnapshot.exists()) {
    throw new Error("Caixa nao encontrado.");
  }

  const caixa = caixaSnapshot.data() as Caixa;
  const membersSnapshot = await getDocs(collection(db, "caixas", caixaId, "membros"));
  const activeMembers = sortMembersForSchedule(
    membersSnapshot.docs
      .map((snapshot) => snapshot.data() as CaixaMembro)
      .filter((membro) => membro.status === "ativo"),
  );

  if (activeMembers.length !== caixa.totalMeses) {
    throw new Error(
      "O rodizio so pode ser preparado quando o numero de membros ativos for igual ao total de meses do caixa.",
    );
  }

  await Promise.all(
    activeMembers.map((membro, index) =>
      updateDoc(doc(db, "caixas", caixaId, "membros", membro.email!.trim().toLowerCase()), {
        ordemSorteio: index + 1,
        mesRecebimento: index + 1,
      }),
    ),
  );

  await syncInviteSummary(caixaId);
}

export async function advanceCaixaMonth(caixaId: string) {
  const caixaRef = doc(db, "caixas", caixaId);
  const caixaSnapshot = await getDoc(caixaRef);

  if (!caixaSnapshot.exists()) {
    throw new Error("Caixa nao encontrado.");
  }

  const caixa = caixaSnapshot.data() as Caixa;
  const membersSnapshot = await getDocs(collection(db, "caixas", caixaId, "membros"));
  const activeMembers = membersSnapshot.docs
    .map((snapshot) => snapshot.data() as CaixaMembro)
    .filter((membro) => membro.status === "ativo");
  const paymentsSnapshot = await getDocs(collection(db, "caixas", caixaId, "pagamentos"));
  const currentMonthPayments = paymentsSnapshot.docs
    .map((snapshot) => snapshot.data() as CaixaPagamento)
    .filter((pagamento) => pagamento.mes === caixa.mesAtual);

  if (activeMembers.some((membro) => membro.mesRecebimento == null)) {
    throw new Error("Prepare o rodizio do caixa antes de avancar o mes.");
  }

  const confirmedCount = currentMonthPayments.filter(
    (pagamento) => pagamento.status === "confirmado",
  ).length;

  if (confirmedCount < activeMembers.length) {
    throw new Error(
      `Ainda faltam ${activeMembers.length - confirmedCount} pagamentos confirmados neste mes.`,
    );
  }

  if (caixa.mesAtual >= caixa.totalMeses) {
    await updateDoc(caixaRef, {
      status: "encerrado",
      updatedAt: serverTimestamp(),
    });
    return {
      status: "encerrado" as const,
      mesAtual: caixa.mesAtual,
    };
  }

  await updateDoc(caixaRef, {
    mesAtual: caixa.mesAtual + 1,
    updatedAt: serverTimestamp(),
  });

  await syncInviteSummary(caixaId);

  return {
    status: "avancado" as const,
    mesAtual: caixa.mesAtual + 1,
  };
}

export async function exportCaixaBackup(caixaId: string) {
  const caixaSnapshot = await getDoc(doc(db, "caixas", caixaId));

  if (!caixaSnapshot.exists()) {
    throw new Error("Caixa nao encontrado.");
  }

  const caixa = caixaSnapshot.data() as Caixa;
  const membrosSnapshot = await getDocs(collection(db, "caixas", caixaId, "membros"));
  const pagamentosSnapshot = await getDocs(collection(db, "caixas", caixaId, "pagamentos"));
  const notasSnapshot = await getDocs(collection(db, "caixas", caixaId, "notas"));

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    sourceCaixaId: caixaId,
    caixa: {
      nome: caixa.nome,
      descricao: caixa.descricao,
      gerenteId: caixa.gerenteId,
      gerenteEmail: caixa.gerenteEmail,
      valorMensal: caixa.valorMensal,
      totalPorMes: caixa.totalPorMes,
      totalMeses: caixa.totalMeses,
      mesAtual: caixa.mesAtual,
      status: caixa.status,
      origem: caixa.origem,
      dataInicio: timestampToIso(caixa.dataInicio),
      linkExpiraEm: timestampToIso(caixa.linkExpiraEm),
      rankingAtivo: caixa.rankingAtivo,
    },
    membros: membrosSnapshot.docs.map((snapshot) => {
      const membro = snapshot.data() as CaixaMembro;
      return {
        userId: membro.userId,
        email: membro.email,
        nome: membro.nome,
        fotoUrl: membro.fotoUrl,
        cor: membro.cor,
        ordemSorteio: membro.ordemSorteio,
        mesRecebimento: membro.mesRecebimento,
        entradaEm: timestampToIso(membro.entradaEm),
        status: membro.status,
        substituidoPor: membro.substituidoPor,
      };
    }),
    pagamentos: pagamentosSnapshot.docs.map((snapshot) => {
      const pagamento = snapshot.data() as CaixaPagamento;
      return {
        id: pagamento.id,
        membroId: pagamento.membroId,
        mes: pagamento.mes,
        valor: pagamento.valor,
        status: pagamento.status,
        declaradoEm: timestampToIso(pagamento.declaradoEm),
        confirmadoEm: timestampToIso(pagamento.confirmadoEm),
        confirmadoPor: pagamento.confirmadoPor,
        motivoRejeicao: pagamento.motivoRejeicao ?? null,
        comprovante: pagamento.comprovante,
        fonte: pagamento.fonte,
        pontuacaoPontualidade: pagamento.pontuacaoPontualidade,
      };
    }),
    notas: notasSnapshot.docs.map((snapshot) => {
      const nota = snapshot.data() as CaixaNota;
      return {
        id: nota.id,
        mes: nota.mes,
        texto: nota.texto,
        criadoPor: nota.criadoPor,
        criadoEm: timestampToIso(nota.criadoEm),
      };
    }),
  } satisfies CaixaBackupPayload;
}

export async function restoreCaixaFromBackup(
  backup: CaixaBackupPayload,
  profile: UserProfile,
  gerenteId: string,
) {
  const limit = canCreateActiveCaixa(profile.plano, 0);

  if (!limit.allowed) {
    throw new Error(
      "Seu plano Free permite apenas 1 caixa ativo. Encerre o atual ou faca upgrade para Pro.",
    );
  }

  if (backup.version !== 1) {
    throw new Error("Versao de backup nao suportada.");
  }

  const caixaRef = doc(collection(db, "caixas"));
  const linkConvite = crypto.randomUUID().replaceAll("-", "");
  const caixaData = backup.caixa;

  await setDoc(caixaRef, {
    id: caixaRef.id,
    nome: caixaData.nome,
    descricao: caixaData.descricao,
    gerenteId,
    gerenteEmail: profile.email,
    valorMensal: caixaData.valorMensal,
    totalPorMes: caixaData.totalPorMes,
    totalMeses: caixaData.totalMeses,
    mesAtual: caixaData.mesAtual,
    status: caixaData.status,
    origem: "importado",
    dataInicio: isoToTimestamp(caixaData.dataInicio) ?? serverTimestamp(),
    linkConvite,
    linkExpiraEm: isoToTimestamp(caixaData.linkExpiraEm),
    rankingAtivo: caixaData.rankingAtivo,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await Promise.all(
    backup.membros.map(async (membro, index) => {
      const memberDocId =
        membro.email?.trim().toLowerCase() || `${membro.userId || "membro"}_${index}`;
      await setDoc(doc(db, "caixas", caixaRef.id, "membros", memberDocId), {
        userId: membro.userId,
        email: membro.email?.trim().toLowerCase() ?? null,
        nome: membro.nome,
        fotoUrl: membro.fotoUrl,
        cor: membro.cor,
        ordemSorteio: membro.ordemSorteio,
        mesRecebimento: membro.mesRecebimento,
        entradaEm: isoToTimestamp(membro.entradaEm) ?? serverTimestamp(),
        status: membro.status,
        substituidoPor: membro.substituidoPor,
      });

      if (membro.userId) {
        await setDoc(
          doc(db, "painel_index", membro.userId),
          {
            participa: arrayUnion(caixaRef.id),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }
    }),
  );

  await Promise.all(
    backup.pagamentos.map((pagamento) =>
      setDoc(doc(db, "caixas", caixaRef.id, "pagamentos", pagamento.id), {
        ...pagamento,
        declaradoEm: isoToTimestamp(pagamento.declaradoEm),
        confirmadoEm: isoToTimestamp(pagamento.confirmadoEm),
      }),
    ),
  );

  await Promise.all(
    backup.notas.map((nota) =>
      setDoc(doc(db, "caixas", caixaRef.id, "notas", nota.id), {
        ...nota,
        criadoEm: isoToTimestamp(nota.criadoEm),
      }),
    ),
  );

  await setDoc(
    doc(db, "painel_index", gerenteId),
    {
      gerencia: arrayUnion(caixaRef.id),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await syncInviteSummary(caixaRef.id);

  return caixaRef.id;
}
