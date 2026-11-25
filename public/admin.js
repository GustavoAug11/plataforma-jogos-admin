const profInfo = document.getElementById("prof-info");
const btnSairAdmin = document.getElementById("btn-sair-admin");
const formJogo = document.getElementById("form-jogo");
const tituloForm = document.getElementById("titulo-form");
const inputJogoId = document.getElementById("jogo-id");
const inputTitulo = document.getElementById("jogo-titulo");
const inputFaixa = document.getElementById("jogo-faixa");
const inputDescricao = document.getElementById("jogo-descricao");
const inputRota = document.getElementById("jogo-rota");
const adminFeedback = document.getElementById("admin-feedback");
const btnCancelarEdicao = document.getElementById("btn-cancelar-edicao");
const tabelaJogosAdmin = document.getElementById("tabela-jogos-admin");

let listaJogosCache = [];

function mostrarFeedback(mensagem) {
    adminFeedback.textContent = mensagem;
    adminFeedback.classList.remove("oculto");
}

function limparFeedback() {
    adminFeedback.textContent = "";
    adminFeedback.classList.add("oculto");
}

async function verificarAcessoProfessor() {
    const resposta = await fetch("/api/me");
    if (!resposta.ok) {
        window.location.href = "/";
        return;
    }

    const { usuario } = await resposta.json();
    if (usuario.perfil !== "PROFESSOR" && usuario.perfil !== "ADMIN") {
        window.location.href = "/";
        return;
    }

    profInfo.textContent = `${usuario.nome} • ${usuario.departamento || "Professor"}`;
    carregarJogosAdmin();
}

async function carregarJogosAdmin() {
    const resposta = await fetch("/api/admin/jogos");
    if (!resposta.ok) {
        window.location.href = "/";
        return;
    }

    const { jogos } = await resposta.json();
    listaJogosCache = jogos;
    renderizarListaJogos();
}

function renderizarListaJogos() {
    tabelaJogosAdmin.innerHTML = "";

    listaJogosCache.forEach(jogo => {
        const item = document.createElement("div");
        item.className = `jogo-card ${jogo.ativo ? "" : "inativo"}`;

        const tagStatus = jogo.ativo
            ? `<span class="status-tag status-ativo">ATIVO</span>`
            : `<span class="status-tag status-inativo">INATIVO</span>`;

        item.innerHTML = `
            <div class="jogo-info">
                <h4>${jogo.titulo} ${tagStatus}</h4>
                <p>${jogo.descricao}</p>
                <span class="jogo-meta">Faixa: ${jogo.faixaEtariaRecomendada} | Rota: ${jogo.rota}</span>
            </div>
            <div class="jogo-acoes">
                <button class="btn-secundario" onclick="prepararEdicao(${jogo.id})">Editar</button>
                <button class="btn-secundario" onclick="alternarStatus(${jogo.id})">
                    ${jogo.ativo ? "Inativar" : "Ativar"}
                </button>
            </div>
        `;
        tabelaJogosAdmin.appendChild(item);
    });
}

window.prepararEdicao = function(id) {
    const jogo = listaJogosCache.find(j => j.id === id);
    if (!jogo) return;

    limparFeedback();
    tituloForm.textContent = `Editando: ${jogo.titulo}`;
    inputJogoId.value = jogo.id;
    inputTitulo.value = jogo.titulo;
    inputFaixa.value = jogo.faixaEtariaRecomendada;
    inputDescricao.value = jogo.descricao;
    inputRota.value = jogo.rota;
    btnCancelarEdicao.classList.remove("oculto");
};

function resetarFormulario() {
    formJogo.reset();
    inputJogoId.value = "";
    tituloForm.textContent = "Cadastrar Novo Jogo";
    btnCancelarEdicao.classList.add("oculto");
    limparFeedback();
}

window.alternarStatus = async function(id) {
    const resposta = await fetch(`/api/admin/jogos/${id}/status`, {
        method: "PATCH"
    });

    if (resposta.ok) {
        carregarJogosAdmin();
    }
};

formJogo.addEventListener("submit", async (event) => {
    event.preventDefault();
    limparFeedback();

    const payload = {
        titulo: inputTitulo.value,
        faixaEtariaRecomendada: inputFaixa.value,
        descricao: inputDescricao.value,
        rota: inputRota.value
    };

    const idEdicao = inputJogoId.value;
    const url = idEdicao ? `/api/admin/jogos/${idEdicao}` : "/api/admin/jogos";
    const metodo = idEdicao ? "PUT" : "POST";

    const resposta = await fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
        mostrarFeedback(dados.erro || "Erro ao salvar o jogo.");
        return;
    }

    resetarFormulario();
    carregarJogosAdmin();
});

btnCancelarEdicao.addEventListener("click", resetarFormulario);

btnSairAdmin.addEventListener("click", async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/";
});

window.addEventListener("DOMContentLoaded", verificarAcessoProfessor);
