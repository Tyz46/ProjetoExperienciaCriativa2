// Tela de alteracao de servico publicado por prestador.
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

let podeAlterar = false;
let usuarioLogado = null;

document.addEventListener("DOMContentLoaded", async () => {
    const url = new URLSearchParams(window.location.search);
    const id = url.get("id");

    configurarHabilidades();

    const sessao = await valida_sessao();
    usuarioLogado = sessao.data;
    podeAlterar = usuarioLogado?.tipo === "prestador" || usuarioLogado?.tipo === "admin";

    if (!podeAlterar) {
        alert("Apenas prestadores podem alterar servicos nesta aba.");
        window.location.href = "../html/prestador.html";
        return;
    }

    if (!id) {
        alert("Servico nao encontrado.");
        window.location.href = "../html/prestador.html";
        return;
    }

    buscarDados(id);
});

// Atualiza a lista de habilidades sempre que a profissao muda.
function configurarHabilidades() {
    const profissao = document.getElementById("profissao");
    profissao.addEventListener("change", () => {
        renderizarHabilidades(profissao.value);
    });
    renderizarHabilidades("");
}

// Busca o servico atual e preenche o formulario de edicao.
async function buscarDados(id) {
    const retorno = await fetch("../php/prestadores_get.php?id=" + id);
    const resposta = await retorno.json();

    if (resposta.status === "ok" && resposta.data.length > 0) {
        const reg = resposta.data[0];

        if (!podeGerenciarRegistro(reg)) {
            alert("Voce so pode alterar servicos criados pela sua conta.");
            window.location.href = "../html/prestador.html";
            return;
        }

        document.getElementById("id").value = reg.id;
        document.getElementById("nome").value = reg.nome ?? "";
        document.getElementById("descricao").value = reg.descricao ?? "";
        document.getElementById("tipo").value = reg.tipo ?? "";
        document.getElementById("profissao").value = reg.profissao ?? "";
        renderizarHabilidades(reg.profissao ?? "", parsearHabilidades(reg.habilidades));
        document.getElementById("descricao_especialidades").value = reg.descricao_especialidades ?? "";
        document.getElementById("valor").value = reg.valor ?? "";
        document.getElementById("localidade").value = reg.localidade ?? "";
    } else {
        alert("Erro: " + resposta.mensagem);
        window.location.href = "../html/prestador.html";
    }
}

// Permite edicao apenas para o dono do servico ou para admin.
function podeGerenciarRegistro(registro) {
    return usuarioLogado?.tipo === "admin" || Number(registro.id_usuario) === Number(usuarioLogado?.id);
}

document.getElementById("enviar").addEventListener("click", alterar);

document.getElementById("voltar").addEventListener("click", () => {
    window.location.href = "../html/prestador.html";
});

// Coleta os novos valores e envia a atualizacao para o backend.
async function alterar() {
    if (!podeAlterar) {
        alert("Apenas prestadores podem alterar servicos nesta aba.");
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
    const id = document.getElementById("id").value;

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

    const retorno = await fetch("../php/prestadores_alterar.php?id=" + id, {
        method: "POST",
        credentials: "same-origin",
        body: fd
    });
    const resposta = await retorno.json();

    if (resposta.status === "ok") {
        alert("Servico alterado com sucesso!");
        window.location.href = "../html/prestador.html";
    } else {
        alert("Erro: " + resposta.mensagem);
    }
}

// Renderiza os checkboxes de habilidades sugeridas para a profissao escolhida.
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

// Le apenas as habilidades marcadas pela pessoa usuaria.
function obterHabilidadesSelecionadas() {
    return Array.from(document.querySelectorAll('input[name="habilidades"]:checked'))
        .map((campo) => campo.value.trim())
        .filter(Boolean);
}

// Faz o parse defensivo do JSON de habilidades vindo do backend.
function parsearHabilidades(valor) {
    if (!valor) {
        return [];
    }

    try {
        const habilidades = JSON.parse(valor);
        return Array.isArray(habilidades) ? habilidades : [];
    } catch (erro) {
        return [];
    }
}

// Escapa caracteres especiais antes de inserir texto em HTML.
function escaparHtml(valor) {
    const elemento = document.createElement("span");
    elemento.textContent = valor;
    return elemento.innerHTML;
}
