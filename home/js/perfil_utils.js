function urlPerfilUsuario(idUsuario) {
    const id = Number(idUsuario);
    if (!id) {
        return "#";
    }
    const pathSegments = window.location.pathname.split('/');
    const rootPath = pathSegments.length > 1 ? pathSegments.slice(0, 2).join('/') : '';
    return `${rootPath}/home/html/perfil.html?id=${id}`;
}

function escaparHtmlPerfil(valor) {
    const elemento = document.createElement("span");
    elemento.textContent = valor ?? "";
    return elemento.innerHTML;
}

function linkPerfilUsuario(idUsuario, nomeExibicao, textoBotao) {
    const id = Number(idUsuario);
    const nome = nomeExibicao || "Usuario";
    const texto = textoBotao || `Ver perfil de ${nome}`;

    if (!id) {
        return `<span class="text-secondary small">${escaparHtmlPerfil(nome)}</span>`;
    }

    return `
        <a href="${urlPerfilUsuario(id)}" class="profile-link-btn">
            <i class="bi bi-person-circle me-1"></i>${escaparHtmlPerfil(texto)}
        </a>
    `;
}

function definirLinkPerfilNoElemento(elementoId, idUsuario, nomeExibicao, textoBotao) {
    const elemento = document.getElementById(elementoId);
    if (!elemento) {
        return;
    }
    elemento.innerHTML = linkPerfilUsuario(idUsuario, nomeExibicao, textoBotao);
}
