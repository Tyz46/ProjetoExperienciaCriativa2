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
    const retorno = await fetch("../php/prestadores_get.php?id="+id);
    const resposta = await retorno.json();
    if(resposta.status == "ok"){
        alert("Sucesso! " + resposta.mensagem);
        var reg = resposta.data[0];
        document.getElementById("nome").value = reg.nome;
        document.getElementById("tipo").value = reg.tipo;
        document.getElementById("id").value = id;
    }else{
        alert("ERRO! " + resposta.mensagem);
    };
};

document.getElementById("enviar").addEventListener('click', function(){
    alterar();
});

document.getElementById('voltar').addEventListener('click', () => {
    window.location.href = '../html/prestador.html';
});

async function alterar(){
    var name    = document.getElementById("name").value;
    var type  = document.getElementById("type").value;
    var descricion  = document.getElementById("descricion").value;
    var data_pub     = document.getElementById("data_pub").value;
    var id      = document.getElementById("id").value;
    var orcamento = document.getElementById("orcamento").value;

    const fd = new FormData();
    fd.append('name', name);
    fd.append('type', type);
    fd.append('descricion', descricion);
    fd.append('data_pub', data_pub);
    fd.append('orcamento', orcamento);

    const retorno = await fetch("../php/prestadores_alterar.php?id="+id, {
        method: "POST",
        body: fd
    });
    const resposta = await retorno.json();
    if(resposta.status == "ok"){
        alert("Sucesso! " + resposta.mensagem);
        window.location.href = '../html/prestador.html'
    }else{
        alert("ERRO! " + resposta.mensagem);
    }
}