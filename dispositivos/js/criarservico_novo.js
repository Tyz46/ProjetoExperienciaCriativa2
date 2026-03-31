document.addEventListener("DOMContentLoaded", () => {
    valida_sessao();
})
document.getElementById("enviar").addEventListener('click', function(){
    // Chamar a função fetch novo();
    novo();
});

document.getElementById('voltar').addEventListener('click', () => {
    window.location.href = '../html/criarservico.html';
});

async function novo(){
    var nome    = document.getElementById("nome").value;
    var potencia = document.getElementById("potencia").value;
    var tipo   = document.getElementById("tipo").value;
    var data_inst   = document.getElementById("data_inst").value;

    const fd = new FormData();
    fd.append('nome',nome);
    fd.append('potencia',potencia);
    fd.append('tipo',tipo);
    fd.append('data_inst',data_inst);

    const retorno = await fetch("../php/criarservico_novo.php", {
        method: "POST",
        body: fd
    });
    const resposta = await retorno.json();
    if(resposta.status == "ok"){
        alert("Sucesso! " + resposta.mensagem);
        window.location.href = "../html/criarservico.html";
    }else{
        alert("ERRO! " + resposta.mensagem);
    }
}