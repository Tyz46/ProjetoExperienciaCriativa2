let agendaDados = null;

document.addEventListener("DOMContentLoaded", async () => {
    // Aguardar um pouco para deixar o perfil carregar
    setTimeout(inicializarAgenda, 500);
});

// So ativa a agenda quando a pagina de perfil ja carregou e o dono do perfil e prestador.
function inicializarAgenda() {
    // Verificar se estamos no painel de agenda
    if (!document.getElementById("painel-agenda")) return;

    const tabItem = document.getElementById("tab_item_agenda");
    
    if (tabItem) {
        // Mostrar/ocultar aba de agenda baseado no perfil
        if (dadosPerfil && dadosPerfil.eh_proprio_perfil && dadosPerfil.usuario.tipo === 'prestador') {
            tabItem.classList.remove('d-none');
            carregarDisponibilidades();
            configurarEventosAgenda();
        } else {
            tabItem.classList.add('d-none');
        }
    }
}

// Liga o botao de adicionar periodo ao handler correspondente.
function configurarEventosAgenda() {
    const btnAdicionar = document.getElementById("btn_adicionar_disponibilidade");
    
    if (btnAdicionar) {
        btnAdicionar.addEventListener("click", adicionarDisponibilidade);
    }
}

// Busca do backend todos os periodos ocupados do prestador logado.
async function carregarDisponibilidades() {
    try {
        const retorno = await fetch("../php/prestador_disponibilidade_get.php", {
            credentials: "same-origin"
        });
        const resposta = await retorno.json();

        if (resposta.status === "ok") {
            agendaDados = resposta.data;
            renderizarDisponibilidades(resposta.data);
        } else {
            mostrarMensagemAgenda("Erro ao carregar disponibilidades: " + resposta.mensagem, "danger");
        }
    } catch (erro) {
        console.error(erro);
        mostrarMensagemAgenda("Erro ao carregar disponibilidades.", "danger");
    }
}

// Desenha a lista de periodos ocupados e liga os botoes de exclusao.
function renderizarDisponibilidades(disponibilidades) {
    const lista = document.getElementById("lista_disponibilidades");
    
    if (!disponibilidades || disponibilidades.length === 0) {
        lista.innerHTML = '<p class="text-muted text-center py-4">Nenhum período marcado como ocupado.</p>';
        return;
    }

    lista.innerHTML = disponibilidades.map(item => `
        <div class="list-group-item border-bottom d-flex align-items-start justify-content-between gap-3 py-3">
            <div class="flex-grow-1">
                <div class="fw-semibold mb-1">
                    <i class="bi bi-calendar-event me-2"></i>
                    ${formatarData(item.data_inicio)} ${item.hora_inicio} 
                    até 
                    ${formatarData(item.data_fim)} ${item.hora_fim}
                </div>
                <small class="text-muted">
                    Status: <span class="badge bg-warning">Ocupado</span>
                </small>
                ${item.descricao ? `<div class="small text-secondary mt-2">${escaparHtml(item.descricao)}</div>` : ''}
            </div>
            <button type="button" class="btn btn-sm btn-outline-danger btn-remover-disponibilidade" data-id="${item.id}">
                <i class="bi bi-trash"></i>
            </button>
        </div>
    `).join('');

    // Adicionar event listeners aos botões de remover
    document.querySelectorAll(".btn-remover-disponibilidade").forEach(btn => {
        btn.addEventListener("click", () => removerDisponibilidade(btn.dataset.id));
    });
}

// Envia um novo intervalo de indisponibilidade para o backend.
async function adicionarDisponibilidade() {
    const dataInicio = document.getElementById("agenda_data_inicio").value;
    const horaInicio = document.getElementById("agenda_hora_inicio").value;
    const dataFim = document.getElementById("agenda_data_fim").value;
    const horaFim = document.getElementById("agenda_hora_fim").value;
    const descricao = document.getElementById("agenda_descricao").value;

    // Validar campos
    if (!dataInicio || !horaInicio || !dataFim || !horaFim) {
        mostrarMensagemAgenda("Preencha todos os campos obrigatórios.", "danger");
        return;
    }

    const formData = new FormData();
    formData.append("data_inicio", dataInicio);
    formData.append("hora_inicio", horaInicio);
    formData.append("data_fim", dataFim);
    formData.append("hora_fim", horaFim);
    formData.append("descricao", descricao);

    console.log("Enviando:", { dataInicio, horaInicio, dataFim, horaFim, descricao });

    try {
        const retorno = await fetch("../php/prestador_disponibilidade_novo.php", {
            method: "POST",
            body: formData,
            credentials: "same-origin"
        });
        const resposta = await retorno.json();

        console.log("Resposta do servidor:", resposta);

        if (resposta.status === "ok") {
            mostrarMensagemAgenda(resposta.mensagem, "success");
            // Limpar formulário
            document.getElementById("agenda_data_inicio").value = "";
            document.getElementById("agenda_hora_inicio").value = "";
            document.getElementById("agenda_data_fim").value = "";
            document.getElementById("agenda_hora_fim").value = "";
            document.getElementById("agenda_descricao").value = "";
            
            // Recarregar disponibilidades
            await carregarDisponibilidades();
        } else {
            mostrarMensagemAgenda(resposta.mensagem, "danger");
        }
    } catch (erro) {
        console.error("Erro na requisição:", erro);
        mostrarMensagemAgenda("Erro ao adicionar disponibilidade.", "danger");
    }
}

// Exclui um periodo existente depois da confirmacao do usuario.
async function removerDisponibilidade(id) {
    if (!confirm("Tem certeza que deseja remover este período?")) {
        return;
    }

    const formData = new FormData();
    formData.append("id", id);

    try {
        const retorno = await fetch("../php/prestador_disponibilidade_excluir.php", {
            method: "POST",
            body: formData,
            credentials: "same-origin"
        });
        const resposta = await retorno.json();

        if (resposta.status === "ok") {
            mostrarMensagemAgenda(resposta.mensagem, "success");
            await carregarDisponibilidades();
        } else {
            mostrarMensagemAgenda(resposta.mensagem, "danger");
        }
    } catch (erro) {
        console.error(erro);
        mostrarMensagemAgenda("Erro ao remover disponibilidade.", "danger");
    }
}

// Exibe feedback visual temporario logo abaixo do formulario de agenda.
function mostrarMensagemAgenda(mensagem, tipo = "info") {
    const alerta = document.getElementById("agenda_mensagem_alerta");
    alerta.className = `alert alert-${tipo}`;
    alerta.textContent = mensagem;
    alerta.classList.remove("d-none");

    // Auto-ocultar em 5 segundos
    setTimeout(() => {
        alerta.classList.add("d-none");
    }, 5000);
}

// Formata data ISO para o padrao brasileiro.
function formatarData(data) {
    const d = new Date(data + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// Escapa caracteres especiais antes de renderizar descricoes em HTML.
function escaparHtml(texto) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return texto.replace(/[&<>"']/g, m => map[m]);
}
