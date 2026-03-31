document.getElementById('logoff').addEventListener('click', () => {
    logoff();
});

async function logoff(){
    const retorno = await fetch('../php/usuario_logoff.php');
    const resposta = await retorno.json();
    if(resposta.status == 'ok'){
        window.location.href = '../html/login.html';
    }else{
        alert("Falha ao efetuar Login.");
    }
}