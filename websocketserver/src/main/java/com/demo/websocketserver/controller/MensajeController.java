package com.demo.websocketserver.controller;

import com.demo.websocketserver.model.Mensaje;
import com.demo.websocketserver.model.Producto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Controller
public class MensajeController {

    @Autowired
    private SimpMessagingTemplate template;

    private Set<String> usuariosConectados = ConcurrentHashMap.newKeySet();
    @Autowired
    private SimpMessagingTemplate simpMessagingTemplate;

    @MessageMapping("/chat.registro")
    @SendTo("/topic/usuarios")
    public Set<String> registrarUsuario(@Payload Mensaje mensaje) {
        if(mensaje.tipoMensaje() == com.demo.websocketserver.model.TipoMensaje.JOIN) {
            usuariosConectados.add(mensaje.nombre());
        } else if(mensaje.tipoMensaje() == com.demo.websocketserver.model.TipoMensaje.LEAVE) {
            usuariosConectados.remove(mensaje.nombre());
        }
        return usuariosConectados;
    }
    @MessageMapping("/chat.publico")
    @SendTo
    public Mensaje enviarMensajePublico(@Payload Mensaje mensaje) {
        return mensaje;
    }
    @MessageMapping("/chat.privado")
    public void enviarMensajePrivado(@Payload Mensaje mensaje) {
        simpMessagingTemplate.convertAndSendToUser(
                mensaje.destino(),
                "/queue/mensajes",mensaje
        );
    }
    @MessageMapping("/producto.enviar")
    public void enviarProducto(@Payload Producto producto) {
        if(producto.destino() == null || producto.destino().isEmpty()) {
            template.convertAndSend("/topic/productos", producto);
        } else {
            template.convertAndSendToUser(producto.destino(), "/queue/productos", producto);

        }
    }
}
