const telaLogin = document.getElementById("tela-login");
const telaPainel = document.getElementById("tela-painel");
const formLogin = document.getElementById("form-login");
const inputIdentificador = document.getElementById("identificador");
const inputSenha = document.getElementById("senha");
const msgErro = document.getElementById("mensagem-erro");

const elUsuarioNome = document.getElementById("usuario-nome");
const elUsuarioInfo = document.getElementById("usuario-info");
const linkAdmin = document.getElementById("link-admin");
const btnSair = document.getElementById("btn-sair");
const listaJogosAluno = document.getElementById("lista-jogos-aluno");

function exibirErro(mensagem) {
    msgErro.textContent = mensagem;
    msgErro.classList.remove("oculto");
}

function limparErro() {
    msgErro.textContent = "";
    msgErro.classList.add("oculto");
}

async function realizarLogin(identificador, senha) {
    try {
        const resposta = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identificador, senha })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            exibirErro(dados.erro || "Erro ao autenticar.");
            return;
        }

        limparErro();

        if (dados.usuario.perfil === "PROFESSOR" || dados.usuario.perfil === "ADMIN") {
            window.location.href = "/admin.html";
            return;
        }

        carregarPainel(dados.usuario);
    } catch (e) {
        exibirErro("Falha de comunicação com o servidor da escola.");
    }
}

async function carregarCatalogoAluno() {
    const resposta = await fetch("/api/jogos");
    if (!resposta.ok) return;

    const { jogos } = await resposta.json();
    listaJogosAluno.innerHTML = "";

    if (jogos.length === 0) {
        listaJogosAluno.innerHTML = "<p>Nenhum jogo ativo disponível no momento.</p>";
        return;
    }

    jogos.forEach(jogo => {
        const card = document.createElement("div");
        card.className = "jogo-card";
        card.innerHTML = `
            <div class="jogo-info">
                <h4>${jogo.titulo}</h4>
                <p>${jogo.descricao}</p>
                <span class="jogo-meta">Indicação: ${jogo.faixaEtariaRecomendada}</span>
            </div>
            <button class="btn-primario" style="width: auto; padding: 10px 16px;" onclick="alert('Iniciando ${jogo.titulo}...')">Jogar</button>
        `;
        listaJogosAluno.appendChild(card);
    });
}

function carregarPainel(usuario) {
    telaLogin.classList.add("oculto");
    telaPainel.classList.remove("oculto");

    elUsuarioNome.textContent = `Olá, ${usuario.nome}!`;

    if (usuario.perfil === "PROFESSOR" || usuario.perfil === "ADMIN") {
        elUsuarioInfo.textContent = `Professor • ${usuario.departamento || "Corpo Docente"}`;
        linkAdmin.classList.remove("oculto");
    } else {
        elUsuarioInfo.textContent = `${usuario.turma} • ${usuario.faixaEtaria}`;
        linkAdmin.classList.add("oculto");
    }

    carregarCatalogoAluno();
}

async function encerrarSessao() {
    await fetch("/api/logout", { method: "POST" });
    formLogin.reset();
    limparErro();
    linkAdmin.classList.add("oculto");
    telaPainel.classList.add("oculto");
    telaLogin.classList.remove("oculto");
}

formLogin.addEventListener("submit", (event) => {
    event.preventDefault();
    realizarLogin(inputIdentificador.value, inputSenha.value);
});

btnSair.addEventListener("click", encerrarSessao);

window.addEventListener("DOMContentLoaded", async () => {
    const resposta = await fetch("/api/me");
    if (resposta.ok) {
        const { usuario } = await resposta.json();
        carregarPainel(usuario);
    }
});
