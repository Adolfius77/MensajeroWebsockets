// declare stomp client
let stompCliente = null;

// function to suscribe to the broker
const onConnectSocket = () => {
    setEstado(true);
    stompCliente.subscribe('/topic/chat.publico', (mensaje) => {
        mostrarMensaje(mensaje.body);
    });
    stompCliente.subscribe('/topic/usuarios', (mensaje) => {
        mostrarUsuarios(JSON.parse(mensaje.body));
    });
    stompCliente.subscribe('/user/queue/mensajes', (mensaje) => {
        recibirPrivado(mensaje.body);
    });
    stompCliente.subscribe('/topic/productos', (mensaje) => {
        recibirEntidad(mensaje.body);
    });
    stompCliente.subscribe('/user/queue/productos', (mensaje) => {
        recibirEntidad(mensaje.body);
    });
    stompCliente.publish({
        destination: '/app/chat.registro',
        body: JSON.stringify({ nombre: miNombre, tipoMensaje: 'JOIN' })
    });
};

// what to do when websocket closes
const onWebSocketClose = () => {
    setEstado(false);
    document.getElementById('txtNombre').disabled = false;
    document.getElementById('btnRegistrar').disabled = false;
    if (stompCliente !== null) {
        stompCliente.deactivate();
    }
};

// function to connect to websocket
const conectarWS = (nombre) => {
    // Avoid having many open connections
    onWebSocketClose();

    // Create client
    stompCliente = new StompJs.Client({
        webSocketFactory: () => new WebSocket('ws://localhost:8080/ws'),
        connectHeaders: { login: nombre }
    });
    stompCliente.onConnect = onConnectSocket;
    stompCliente.onWebSocketClose = onWebSocketClose;
    stompCliente.activate();
};

const websocketListo = () => {
    if (stompCliente === null || !stompCliente.connected) {
        alert('Espera a que se conecte el mensajero');
        return false;
    }
    return true;
};

// function to send message
const enviarMensaje = () => {
    if (miNombre === null || !websocketListo()) return;
    // Identify elements
    let txtMensaje = document.getElementById('txtMensaje');

    // publish message
    stompCliente.publish({
        destination: '/app/chat.publico',
        body: JSON.stringify({
            nombre: miNombre,
            contenido: txtMensaje.value,
            tipoMensaje: 'CHAT'
        })
    });
    txtMensaje.value = '';
};

// function to show message (burbujas de chat)
const mostrarMensaje = (mensaje) => {
    const body = JSON.parse(mensaje);
    const esPrivado = /privado/i.test(body.nombre);
    const esPropio = esPrivado ? body.nombre.startsWith('Tú') : body.nombre === miNombre;

    const li = document.createElement('li');
    li.classList.add('msg', esPropio ? 'msg--own' : 'msg--other');
    if (esPrivado) li.classList.add('msg--private');

    const autor = document.createElement('span');
    autor.className = 'msg__author';
    autor.textContent = body.nombre;
    const texto = document.createElement('span');
    texto.textContent = body.contenido;

    li.append(autor, texto);
    document.getElementById('ULMensajes').appendChild(li);

    const caja = document.getElementById('mensajes');
    caja.scrollTop = caja.scrollHeight;
};

// indicador visual de conexión
const setEstado = (conectado) => {
    document.getElementById('estadoConexion').classList.toggle('status-pill--on', conectado);
    document.getElementById('txtEstado').textContent = conectado ? 'Conectado' : 'Desconectado';
};

// Event when all DOM Content is loaded
document.addEventListener('DOMContentLoaded', () => {
    const btnEnviar = document.getElementById('btnEnviar');
    btnEnviar.addEventListener('click', (e) => {
        e.preventDefault();
        enviarMensaje();
    });
    document.getElementById('txtMensaje').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); enviarMensaje(); }
    });
});

let miNombre = null;
let destinatario = null;      // null = todos
let usuariosConectados = [];

const registrarse = () => {
    const nombre = document.getElementById('txtNombre').value.trim();
    if (nombre === '') {
        alert('Escribe tu nombre');
        return;
    }
    miNombre = nombre;
    document.getElementById('txtNombre').disabled = true;
    document.getElementById('btnRegistrar').disabled = true;
    conectarWS(miNombre);
};

const mostrarUsuarios = (lista) => {
    usuariosConectados = lista;
    if (destinatario !== null && !lista.includes(destinatario)) {
        destinatario = null;
    }

    const ul = document.getElementById('ULUsuarios');
    ul.innerHTML = '';

    [null, ...lista].forEach((nombre) => {
        const li = document.createElement('li');
        li.classList.add('list-group-item');
        if (nombre === destinatario) li.classList.add('active');
        li.textContent = nombre === null ? 'Todos' : nombre;

        if (nombre === miNombre && nombre !== null) {
            li.textContent += ' (tú)';
        } else {
            li.style.cursor = 'pointer';
            li.addEventListener('click', () => {
                destinatario = nombre;
                mostrarUsuarios(usuariosConectados);
            });
        }
        ul.appendChild(li);
    });

    const textoDestino = destinatario === null ? 'Todos' : destinatario;
    document.getElementById('lblDestinatario').textContent = textoDestino;
    document.getElementById('lblDestinoProducto').textContent = textoDestino;
};

const enviarPrivado = () => {
    const txtMensaje = document.getElementById('txtMensaje');
    if (miNombre === null) {
        alert('Primero registra tu nombre');
        return;
    }
    if (destinatario === null) {
        alert('Selecciona un usuario de la lista');
        return;
    }
    if (!websocketListo()) return;
    stompCliente.publish({
        destination: '/app/chat.privado',
        body: JSON.stringify({
            nombre: miNombre,
            destino: destinatario,
            contenido: txtMensaje.value,
            tipoMensaje: 'CHAT'
        })
    });
    mostrarMensaje(JSON.stringify({
        nombre: 'Tú (privado a ' + destinatario + ')',
        contenido: txtMensaje.value
    }));
    txtMensaje.value = '';
};

const recibirPrivado = (cuerpo) => {
    const body = JSON.parse(cuerpo);
    mostrarMensaje(JSON.stringify({
        nombre: body.nombre + ' (privado)',
        contenido: body.contenido
    }));
};

// Lee los datos del formulario y los convierte en un objeto producto
const leerProductoDelFormulario = (form) => {
    const datos = new FormData(form);
    return {
        id: String(parseInt(datos.get('id'), 10)),
        nombre: datos.get('nombre').trim(),
        precio: parseFloat(datos.get('precio')),
        stock: parseInt(datos.get('stock'), 10)
    };
};

const enviarEntidad = (form) => {
    if (miNombre === null) {
        alert('Primero registra tu nombre');
        return;
    }
    if (stompCliente === null || !stompCliente.connected) {
        alert('No hay conexión con el servidor');
        return;
    }

    // El nombre no puede ser solo espacios
    const txtNombreProd = form.querySelector('#txtProdNombre');
    txtNombreProd.setCustomValidity(txtNombreProd.value.trim() === '' ? 'vacío' : '');

    // Validación del formulario (required, min, step, etc.)
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    const mensaje = {
        ...leerProductoDelFormulario(form),
        destino: destinatario,   // null = todos
        emisor: miNombre
    };
    stompCliente.publish({
        destination: '/app/producto.enviar',
        body: JSON.stringify(mensaje)
    });
    if (destinatario !== null) {
        agregarEntidad(mensaje);
    }

    // Limpia el formulario para capturar el siguiente producto
    form.reset();
    form.classList.remove('was-validated');
    form.querySelector('#txtProdId').focus();
};

const recibirEntidad = (cuerpo) => {
    const body = JSON.parse(cuerpo);
    agregarEntidad(body);
};

const agregarEntidad = (msg) => {
    const tr = document.createElement('tr');
    [
        msg.emisor,
        msg.destino ? msg.destino : 'Todos',
        msg.id,
        msg.nombre,
        '$' + Number(msg.precio).toFixed(2),
        msg.stock
    ].forEach((valor) => {
        const td = document.createElement('td');
        td.textContent = valor;
        tr.appendChild(td);
    });
    document.getElementById('tbodyEntidades').appendChild(tr);
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnRegistrar').addEventListener('click', (e) => {
        e.preventDefault();
        registrarse();
    });
    document.getElementById('btnEnviarPrivado').addEventListener('click', (e) => {
        e.preventDefault();
        enviarPrivado();
    });
    const formProducto = document.getElementById('formProducto');
    formProducto.addEventListener('submit', (e) => {
        e.preventDefault();
        enviarEntidad(formProducto);
    });
    formProducto.addEventListener('reset', () => {
        formProducto.classList.remove('was-validated');
    });
});