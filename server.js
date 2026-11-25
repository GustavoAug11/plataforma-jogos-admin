const express = require("express");
const crypto = require("crypto");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());

function hashSHA256(texto) {
    return crypto.createHash("sha256").update(texto).digest("hex");
}

const USUARIOS = [
    {
        id: "20260201",
        nome: "Lucas Oliveira",
        perfil: "ALUNO",
        turma: "2º Ano A",
        faixaEtaria: "7-8 anos",
        nivelSugerido: "facil",
        senhaHash: hashSHA256("1234")
    },
    {
        id: "20260502",
        nome: "Mariana Santos",
        perfil: "ALUNO",
        turma: "5º Ano B",
        faixaEtaria: "10-11 anos",
        nivelSugerido: "medio",
        senhaHash: hashSHA256("4321")
    },
    {
        id: "PROF1001",
        nome: "Prof. Carlos Mendes",
        perfil: "PROFESSOR",
        departamento: "Matemática e Lógica",
        senhaHash: hashSHA256("admin2026")
    }
];

let catalogoJogos = [
    {
        id: 1,
        titulo: "Dedução Numérica",
        descricao: "Descubra o número secreto usando a lógica e busca binária.",
        faixaEtariaRecomendada: "7 a 13 anos (2º ao 7º ano)",
        rota: "/jogos/deducao-numerica",
        ativo: true
    },
    {
        id: 2,
        titulo: "Desafio das Frações",
        descricao: "Associe frações equivalentes contra o relógio.",
        faixaEtariaRecomendada: "9 a 12 anos (4º ao 6º ano)",
        rota: "/jogos/fracoes",
        ativo: false
    }
];

const sessoesAtivas = new Map();

function extrairToken(req) {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return null;
    const cookies = Object.fromEntries(
        cookieHeader.split(";").map(c => c.trim().split("="))
    );
    return cookies.sessao_escolar || null;
}

function autenticarSessao(req, res, next) {
    const token = extrairToken(req);
    if (!token || !sessoesAtivas.has(token)) {
        req.usuario = null;
        return next();
    }
    req.usuario = sessoesAtivas.get(token);
    next();
}

function exigirProfessor(req, res, next) {
    if (!req.usuario) {
        if (req.accepts("html") && !req.path.startsWith("/api/")) {
            return res.redirect("/");
        }
        return res.status(401).json({ erro: "Sessão expirada ou não autenticada." });
    }

    if (req.usuario.perfil !== "PROFESSOR" && req.usuario.perfil !== "ADMIN") {
        if (req.accepts("html") && !req.path.startsWith("/api/")) {
            return res.status(403).send(`
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head><meta charset="UTF-8"><title>Acesso Negado</title></head>
                <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #f8fafc;">
                    <h1 style="color: #b91c1c;">403 - Acesso Restrito</h1>
                    <p>Esta área é exclusiva para professores e administradores da escola.</p>
                    <a href="/" style="display: inline-block; margin-top: 16px; color: #2563eb;">Voltar para a Sala de Jogos</a>
                </body>
                </html>
            `);
        }
        return res.status(403).json({ erro: "Acesso negado. Permissão insuficiente." });
    }

    next();
}

app.use(autenticarSessao);

app.get("/admin.html", exigirProfessor, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.use(express.static(path.join(__dirname, "public")));

app.post("/api/login", (req, res) => {
    const { identificador, senha } = req.body;

    if (!identificador || !senha) {
        return res.status(400).json({ erro: "Preencha sua matrícula/login e senha." });
    }

    const usuario = USUARIOS.find(u => u.id.toUpperCase() === identificador.trim().toUpperCase());

    if (!usuario || usuario.senhaHash !== hashSHA256(senha.trim())) {
        return res.status(401).json({ erro: "Credenciais inválidas. Verifique seus dados." });
    }

    const token = crypto.randomBytes(24).toString("hex");
    const dadosSessao = {
        id: usuario.id,
        nome: usuario.nome,
        perfil: usuario.perfil,
        turma: usuario.turma || null,
        faixaEtaria: usuario.faixaEtaria || null,
        nivelSugerido: usuario.nivelSugerido || null,
        departamento: usuario.departamento || null
    };

    sessoesAtivas.set(token, dadosSessao);

    res.setHeader("Set-Cookie", `sessao_escolar=${token}; HttpOnly; Path=/; SameSite=Strict`);
    res.json({ usuario: dadosSessao });
});

app.post("/api/logout", (req, res) => {
    const token = extrairToken(req);
    if (token) sessoesAtivas.delete(token);
    res.setHeader("Set-Cookie", "sessao_escolar=; HttpOnly; Path=/; Max-Age=0");
    res.json({ mensagem: "Sessão encerrada." });
});

app.get("/api/me", (req, res) => {
    if (!req.usuario) {
        return res.status(401).json({ erro: "Não autenticado." });
    }
    res.json({ usuario: req.usuario });
});

app.get("/api/jogos", (req, res) => {
    if (!req.usuario) {
        return res.status(401).json({ erro: "Não autenticado." });
    }
    const jogosDisponiveis = catalogoJogos.filter(j => j.ativo);
    res.json({ jogos: jogosDisponiveis });
});

app.get("/api/admin/jogos", exigirProfessor, (req, res) => {
    res.json({ jogos: catalogoJogos });
});

app.post("/api/admin/jogos", exigirProfessor, (req, res) => {
    const { titulo, descricao, faixaEtariaRecomendada, rota } = req.body;

    if (!titulo || !descricao || !faixaEtariaRecomendada || !rota) {
        return res.status(400).json({ erro: "Todos os campos do jogo são obrigatórios." });
    }

    const novoJogo = {
        id: catalogoJogos.length > 0 ? Math.max(...catalogoJogos.map(j => j.id)) + 1 : 1,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        faixaEtariaRecomendada: faixaEtariaRecomendada.trim(),
        rota: rota.trim(),
        ativo: true
    };

    catalogoJogos.push(novoJogo);
    res.status(201).json({ jogo: novoJogo });
});

app.put("/api/admin/jogos/:id", exigirProfessor, (req, res) => {
    const id = parseInt(req.params.id, 10);
    const jogo = catalogoJogos.find(j => j.id === id);

    if (!jogo) {
        return res.status(404).json({ erro: "Jogo não encontrado." });
    }

    const { titulo, descricao, faixaEtariaRecomendada, rota } = req.body;
    if (titulo) jogo.titulo = titulo.trim();
    if (descricao) jogo.descricao = descricao.trim();
    if (faixaEtariaRecomendada) jogo.faixaEtariaRecomendada = faixaEtariaRecomendada.trim();
    if (rota) jogo.rota = rota.trim();

    res.json({ jogo });
});

app.patch("/api/admin/jogos/:id/status", exigirProfessor, (req, res) => {
    const id = parseInt(req.params.id, 10);
    const jogo = catalogoJogos.find(j => j.id === id);

    if (!jogo) {
        return res.status(404).json({ erro: "Jogo não encontrado." });
    }

    jogo.ativo = !jogo.ativo;
    res.json({ jogo });
});

app.listen(PORT, () => {
    console.log(`Servidor escolar rodando em http://localhost:${PORT}`);
});
