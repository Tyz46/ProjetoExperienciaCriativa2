// Primeira etapa - Receber o valor por GET e armazenar no input hidden id
// Segunda etapa - fazer um fetch no projeto_final_get.php e preencher os campos
document.addEventListener("DOMContentLoaded", () => {
    // Pega a URL e grava na variavel
    var url = new URLSearchParams(window.location.search);
    // Busca na URL o ID e armazena na variavel ID
    var id = url.get("id");
    valida_sessao();
    buscarDados(id);
});

async function buscarDados(id){
    const retorno = await fetch("../php/usuario_get.php?id="+id);
    const resposta = await retorno.json();
    if(resposta.status == "ok"){
        alert("Sucesso! " + resposta.mensagem);
        var reg = resposta.data[0];
        document.getElementById("nome").value = reg.nome;
        document.getElementById("usuario").value = reg.usuario;
        document.getElementById("senha").value = reg.senha;
        if (reg.tipo == 1) {
            document.getElementById("tipo_sim").checked = true;
        } else {
            document.getElementById("tipo_nao").checked = false;
        }
        document.getElementById("id").value = id;
    }else{
        alert("ERRO! " + resposta.mensagem);
    };
};

document.getElementById("enviar").addEventListener('click', function(){
    alterar();
});

document.getElementById('voltar').addEventListener('click', () => {
    window.location.href = '../html/registros.html';
});

async function alterar(){
    var nome    = document.getElementById("nome").value;
    var usuario = document.getElementById("usuario").value;
    var senha   = document.getElementById("senha").value;
    var tipo = document.querySelector('input[name="tipo"]:checked')?.value || "0";
    var id      = document.getElementById("id").value;

    const fd = new FormData();
    fd.append('nome',nome);
    fd.append('usuario',usuario);
    fd.append('senha',senha);
    fd.append('tipo',tipo);

    const retorno = await fetch("../php/usuario_alterar.php?id="+id, {
        method: "POST",
        body: fd
    });
    const resposta = await retorno.json();
    if(resposta.status == "ok"){
        alert("Sucesso! " + resposta.mensagem);
        window.location.href = '../html/registros.html'
    }else{
        alert("ERRO! " + resposta.mensagem);
    }
}