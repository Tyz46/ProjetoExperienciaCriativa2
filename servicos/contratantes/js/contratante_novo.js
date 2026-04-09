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
    var nome    = document.getElementById("nome").value;
    var descricao    = document.getElementById("descricao").value;
    var orcamento    = document.getElementById("orcamento").value;
    var data_publicacao   = document.getElementById("data_publicacao").value;

    // Validação: verificar se algum campo está vazio
    if (!nome.trim()) {
        alert("O campo Nome não pode estar vazio.");
        return;
    }
    if (!descricao.trim()) {
        alert("O campo Descrição não pode estar vazio.");
        return;
    }
    if (!orcamento.trim()) {
        alert("O campo Orçamento não pode estar vazio.");
        return;
    }
    if (!data_publicacao.trim()) {
        alert("O campo Data de Publicação não pode estar vazio.");
        return;
    }

    const fd = new FormData();
    fd.append('nome',nome);
    fd.append('descricao',descricao);
    fd.append('orcamento',orcamento);
    fd.append('data_publicacao',data_publicacao);

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