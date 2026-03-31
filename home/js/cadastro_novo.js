document.addEventListener("DOMContentLoaded", () => {
})

document.getElementById("enviar").addEventListener('click', function(){
    // Chamar a função fetch novo();
    novo();
});

document.getElementById('voltar').addEventListener('click', () => {
    window.location.href = '../html/login.html';
});

async function novo(){
    var nome    = document.getElementById("nome").value;
    var usuario = document.getElementById("usuario").value;
    var senha   = document.getElementById("senha").value;
    var tipo = document.querySelector('input[name="tipo"]:checked')?.value || "0";

    const fd = new FormData();
    fd.append('nome',nome);
    fd.append('usuario',usuario);
    fd.append('senha',senha);
    fd.append('tipo',tipo);

    const retorno = await fetch("../php/usuario_novo.php", {
        method: "POST",
        body: fd
    });
    const resposta = await retorno.json();
    if(resposta.status == "ok"){
        alert("Sucesso! " + resposta.mensagem);
        window.location.href = "../html/login.html";
    }else{
        alert("ERRO! " + resposta.mensagem);
    }
}