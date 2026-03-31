document.getElementById('enviar').addEventListener('click', () => {
    consulta();
});

document.getElementById('novo').addEventListener('click', () => {
    window.location.href = '../html/cadastro.html';
});

async function consulta(){
    var usuario = document.getElementById('usuario').value;
    var senha = document.getElementById('senha').value;

    const fd = new FormData();
    fd.append('usuario',usuario);
    fd.append('senha',senha);

    const retorno = await fetch("../php/usuario_login.php",{
        method: 'POST',
        body: fd
    });

    const resposta = await retorno.json();
    if(resposta.status == 'ok'){
        alert("Login efetuado com sucesso!");
        window.location.href = '../html/';
    }else{
        alert("Falha nas credenciais.");
    };
};