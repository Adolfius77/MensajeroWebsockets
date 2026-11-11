package com.demo.websocketserver.model;

public record Producto(
        String id,
        String nombre,
        double precio,
        String destino,
        String emisor,
        int stock
) {
}
