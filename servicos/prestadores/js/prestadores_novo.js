document.addEventListener("DOMContentLoaded", () => {
    valida_sessao();
})
document.getElementById("enviar").addEventListener('click', function(){
    // Chamar a função fetch novo();
    novo();
});

document.getElementById('voltar').addEventListener('click', () => {
    window.location.href = '../html/prestador.html';
});

async function novo(){
    var nome    = document.getElementById("nome").value;
    var descricao    = document.getElementById("descricao").value;
    var preco    = document.getElementById("preco").value;
    var data_publicacao   = document.getElementById("data_publicacao").value;

    const fd = new FormData();
    fd.append('nome',nome);
    fd.append('descricao',descricao);
    fd.append('preco',preco);
    fd.append('data_publicacao',data_publicacao);

    const retorno = await fetch("../php/prestadores_novo.php", {
        method: "POST",
        body: fd
    });
    const resposta = await retorno.json();
    if(resposta.status == "ok"){
        alert("Sucesso! " + resposta.mensagem);
        window.location.href = "../html/prestador.html";
    }else{
        alert("ERRO! " + resposta.mensagem);
    }
}