const HABILIDADES_POR_PROFISSAO = {
    Eletricista: [
        "Instalacao eletrica",
        "Troca de disjuntores",
        "Iluminacao residencial",
        "Manutencao preventiva"
    ],
    Diarista: [
        "Limpeza pesada",
        "Limpeza pos-obra",
        "Organizacao de ambientes",
        "Passadoria"
    ],
    "Tecnico de Informatica": [
        "Formatacao e backup",
        "Montagem de computadores",
        "Remocao de virus",
        "Suporte em redes"
    ],
    Pintor: [
        "Pintura interna",
        "Pintura externa",
        "Tratamento de paredes",
        "Texturas e acabamento"
    ],
    Encanador: [
        "Conserto de vazamentos",
        "Instalacao hidraulica",
        "Troca de registros",
        "Desentupimento"
    ],
    Montador: [
        "Montagem de moveis",
        "Instalacao de paineis",
        "Ajuste de ferragens",
        "Desmontagem e remontagem"
    ]
};

let podeCadastrar = false;

document.addEventListener("DOMContentLoaded", async () => {
    configurarHabilidades();

    const sessao = await valida_sessao();
    podeCadastrar = sessao.data?.tipo === "prestador" || sessao.data?.tipo === "admin";

    if (!podeCadastrar) {
        alert("Apenas prestadores podem criar servicos nesta aba.");
        window.location.href = "../html/prestador.html";
    }
});

document.getElementById("enviar").addEventListener("click", novo);

document.getElementById("voltar").addEventListener("click", () => {
    window.location.href = "../html/prestador.html";
});

function configurarHabilidades() {
    const profissao = document.getElementById("profissao");
    profissao.addEventListener("change", () => {
        renderizarHabilidades(profissao.value);
    });
    renderizarHabilidades("");
}

async function novo() {
    if (!podeCadastrar) {
        alert("Apenas prestadores podem criar servicos nesta aba.");
        return;
    }

    const nome = document.getElementById("nome").value.trim();
    const descricao = document.getElementById("descricao").value.trim();
    const tipo = document.getElementById("tipo").value;
    const profissao = document.getElementById("profissao").value;
    const descricaoEspecialidades = document.getElementById("descricao_especialidades").value.trim();
    const habilidades = obterHabilidadesSelecionadas();
    const valor = document.getElementById("valor").value;
    const localidade = document.getElementById("localidade").value.trim();
    const fotos = document.getElementById("fotos").files;

    if (!nome || !descricao || !tipo || !profissao || habilidades.length === 0 || !valor || !localidade) {
        alert("Preencha todos os campos obrigatorios e escolha ao menos uma habilidade.");
        return;
    }

    const fd = new FormData();
    fd.append("nome", nome);
    fd.append("descricao", descricao);
    fd.append("tipo", tipo);
    fd.append("profissao", profissao);
    fd.append("descricao_especialidades", descricaoEspecialidades);
    habilidades.forEach((habilidade) => fd.append("habilidades[]", habilidade));
    fd.append("valor", valor);
    fd.append("localidade", localidade);
    adicionarFotos(fd, fotos);

    try {
        const retorno = await fetch("../php/prestadores_novo.php", {
            method: "POST",
            credentials: "same-origin",
            body: fd
        });
        const resposta = await retorno.json();

        if (resposta.status === "ok") {
            alert("Servico cadastrado com sucesso!");
            window.location.href = "../html/prestador.html";
        } else {
            alert("Erro: " + resposta.mensagem);
        }
    } catch (erro) {
        console.error(erro);
        alert("Erro de conexao. Verifique se o servidor esta em execucao.");
    }
}

function renderizarHabilidades(profissao, selecionadas = []) {
    const container = document.getElementById("habilidadesGrupo");
    const habilidades = HABILIDADES_POR_PROFISSAO[profissao] || [];

    if (habilidades.length === 0) {
        container.innerHTML = '<div class="empty-inline-state">Selecione uma profissao para carregar as habilidades.</div>';
        return;
    }

    container.innerHTML = habilidades.map((habilidade) => `
        <label class="skill-option">
            <input
                type="checkbox"
                name="habilidades"
                value="${escaparHtml(habilidade)}"
                ${selecionadas.includes(habilidade) ? "checked" : ""}
            >
            <span>${escaparHtml(habilidade)}</span>
        </label>
    `).join("");
}

function obterHabilidadesSelecionadas() {
    return Array.from(document.querySelectorAll('input[name="habilidades"]:checked'))
        .map((campo) => campo.value.trim())
        .filter(Boolean);
}

function adicionarFotos(fd, fotos) {
    for (const foto of fotos) {
        fd.append("fotos[]", foto);
    }
}

function escaparHtml(valor) {
    const elemento = document.createElement("span");
    elemento.textContent = valor;
    return elemento.innerHTML;
}
