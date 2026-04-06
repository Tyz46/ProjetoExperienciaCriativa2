document.addEventListener("DOMContentLoaded", () => {
    valida_sessao();
})
document.getElementById("enviar").addEventListener('click', function(){
    // Chamar a função fetch novo();
    novo();
});

document.getElementById('voltar').addEventListener('click', () => {
    window.location.href = '../html/contratante.html';
});

async function novo(){
    var nome      = document.getElementById("nome").value;
    var tipo      = document.getElementById("tipo").value;
    var preco     = document.getElementById("preco").value;
    var descricao = document.getElementById("descricao").value;
    var data_inst = document.getElementById("data_inst").value;

    const fd = new FormData();
    fd.append('nome', nome);
    fd.append('tipo', tipo);
    fd.append('descricao', descricao);
    fd.append('preco', preco);
    fd.append('data_inst', data_inst);

    const retorno = await fetch("../php/contratantes_novo.php", {
        method: "POST",
        body: fd
    });
    const resposta = await retorno.json();
    if(resposta.status == "ok"){
        alert("Sucesso! " + resposta.mensagem);
        window.location.href = "../html/contratante.html";
    }else{
        alert("ERRO! " + resposta.mensagem);
    }
}