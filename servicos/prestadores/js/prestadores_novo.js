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
    var name       = document.getElementById("name").value;
    var type       = document.getElementById("type").value;
    var orcamento  = document.getElementById("orcamento").value;
    var descricion = document.getElementById("descricion").value;
    var data_pub   = document.getElementById("data_pub").value;
    
    const fd = new FormData();
    fd.append('nome', name);
    fd.append('tipo', type);
    fd.append('descricao', descricion);
    fd.append('orcamento', orcamento);
    fd.append('data_pub', data_pub);

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