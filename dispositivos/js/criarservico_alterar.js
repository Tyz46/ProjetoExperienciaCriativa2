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
    const retorno = await fetch("../php/criarservico_get.php?id="+id);
    const resposta = await retorno.json();
    if(resposta.status == "ok"){
        alert("Sucesso! " + resposta.mensagem);
        var reg = resposta.data[0];
        document.getElementById("nome").value = reg.nome;
        document.getElementById("potencia").value = reg.potencia;
        document.getElementById("tipo").value = reg.tipo;
        document.getElementById("data_inst").value = reg.data_inst;
        document.getElementById("id").value = id;
    }else{
        alert("ERRO! " + resposta.mensagem);
    };
};

document.getElementById("enviar").addEventListener('click', function(){
    alterar();
});

document.getElementById('voltar').addEventListener('click', () => {
    window.location.href = '../html/criarservico.html';
});

async function alterar(){
    var nome    = document.getElementById("nome").value;
    var potencia = document.getElementById("potencia").value;
    var tipo   = document.getElementById("tipo").value;
    var data_inst   = document.getElementById("data_inst").value;
    var id      = document.getElementById("id").value;

    const fd = new FormData();
    fd.append('nome',nome);
    fd.append('potencia',potencia);
    fd.append('tipo',tipo);
    fd.append('data_inst',data_inst);

    const retorno = await fetch("../php/criarservico_alterar.php?id="+id, {
        method: "POST",
        body: fd
    });
    const resposta = await retorno.json();
    if(resposta.status == "ok"){
        alert("Sucesso! " + resposta.mensagem);
        window.location.href = '../html/criarservico.html'
    }else{
        alert("ERRO! " + resposta.mensagem);
    }
}