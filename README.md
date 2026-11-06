## 📌 Visão Geral

Este módulo faz parte do ecossistema de monitoramento **CryptoSight NOC**. Ele é responsável por:
- Receber requisições HTTP POST contendo o endereço MAC e o IP do dispositivo.
- Validar os dados recebidos antes de irem para o banco de dados.
- Armazenar o mapeamento no **Redis** no formato `device:mac:<MAC>` → `<IP>`.
- Aplicar TTL (Time-To-Live) de **6 horas** para expirar automaticamente devido ao DHCP.

---

## 🏗️ Estrutura da Chave no Redis

| Chave | Tipo | Valor | TTL | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `device:mac:<MAC_ADDRESS>` | String | `<IP_ADDRESS>` | 21.600s (6h) | Mapeamento dinâmico de rede local |

*Exemplo:* `device:mac:AA:BB:CC:DD:EE:FF` → `192.168.1.50`

---

## 🚀 Como Executar o Projeto


- **Bun** (v1.0 ou superior) instalado.
- Servidor **Redis** rodando na porta `6379` (localmente ou via Docker).
- A aplicação roda na porta