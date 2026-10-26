# Sheltom GM: ataque 50-50
Data: 26/10/2026.

Pedido: adicionar ataque minimo e maximo de 50 a Sheltom GM ja equipada.
OS199 declara dano 50-50 no catalogo; o recalculo de combate adiciona +50 em cada limite apenas para ADM/GM com OS199 no slot sheltom. O bonus funciona tambem para instancias existentes, sem alterar o banco. O caminho periodico de protecao nao adiciona ataque, evitando acumulo a cada tick. Remover a Sheltom remove o bonus no proximo recalculo.
O adicional entra depois das formulas de equipamento/skills e antes do bonus de Force.
Validacao: 112 testes Node e 67 Python aprovados; sintaxe de session.mjs e git diff --check aprovados.
Clientes abertos precisam salvar e recarregar. Mudanca de Python exige breve reinicio pelo supervisor.
