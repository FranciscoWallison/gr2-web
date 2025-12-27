# Full GR2 Loader - Using Original granny2.dll

## 🎯 Quick Start

Esta é uma versão que **realmente carrega arquivos .gr2** usando a DLL original do Granny2.

### Option 1: Use Full Loader (RECOMMENDED)

```bash
# No diretório raiz do projeto (gr2-web)
npx http-server . -p 8080
```

Então abra no navegador:
```
http://localhost:8080/lib/examples/full-loader.html
```

### Option 2: Servidor Python

```bash
# No diretório raiz
python -m http.server 8080
```

## 🚀 Como Usar

1. **Abra a página** `full-loader.html` em um navegador
2. **Aguarde** o carregamento do `granny2.bin` (aparecerá "✓ Ready!")
3. **Clique** em um dos botões de exemplo:
   - 🎨 empelium90_0.gr2
   - 🚩 guildflag90_1.gr2
   - 🛡️ kguardian90_7.gr2

Ou clique em "📁 Load Custom GR2 File" para carregar seu próprio arquivo.

## ✨ Funcionalidades

- ✅ **Carrega arquivos .gr2 reais** usando granny2.dll
- ✅ **Extrai vértices e índices** corretamente
- ✅ **Renderiza texturas** se disponíveis
- ✅ **Controles de câmera** (arraste com mouse)
- ✅ **Zoom** (roda do mouse)
- ✅ **Toggle Wireframe** (ver estrutura)
- ✅ **Auto-rotação** (opcional)

## 🎮 Controles

- **Arrastar Mouse**: Rotacionar modelo
- **Roda do Mouse**: Zoom in/out
- **Botão Wireframe**: Ver malha 3D
- **Botão Rotation**: Auto-rotação

## 🏗️ Arquitetura

Esta implementação usa:

```
full-loader.html
    ↓
granny2.js (wrapper)
    ↓
pe_env.js (Win32 API)
    ↓
v86.js (x86 emulator)
    ↓
granny2.bin (DLL original)
```

## 📊 Diferenças entre Versões

### Full Loader (esta versão)
- ✅ Carrega arquivos .gr2 reais
- ✅ Usa granny2.dll (100% compatível)
- ⚠️ Mais lento (emulação x86)
- ⚠️ ~500KB de dependências

### Basic Loader (TypeScript)
- ✅ Rápido e leve (~50KB)
- ✅ TypeScript moderno
- ⚠️ Parser incompleto
- ⚠️ Apenas demo por enquanto

## 🐛 Troubleshooting

### Erro: "Failed to load granny2.bin"
- Certifique-se de estar rodando de um servidor HTTP
- Verifique se `granny2.bin` está no diretório raiz

### Erro: "CORS policy"
- Não abra o arquivo diretamente (file://)
- Use um servidor HTTP (http-server, Python, etc)

### Modelo não aparece
- Verifique o console do navegador (F12)
- Alguns modelos podem estar muito grandes/pequenos
- Tente dar zoom out (roda do mouse)

## 📝 Arquivos Carregáveis

Os arquivos .gr2 incluídos são de exemplo:

- `empelium90_0.gr2` - 51KB - Modelo pequeno
- `guildflag90_1.gr2` - 56KB - Bandeira
- `kguardian90_7.gr2` - 133KB - Modelo maior

## 🔮 Próximos Passos

Para uma versão totalmente JavaScript (sem DLL):

1. Completar o parser TypeScript em `src/parser/GR2Parser.ts`
2. Implementar descompressão completa
3. Extrair todas as estruturas de dados
4. Testar com vários arquivos .gr2

## ⚡ Performance

| Operação | Tempo Aprox. |
|----------|--------------|
| Carregar granny2.bin | ~100ms |
| Parsear arquivo .gr2 | ~500-2000ms |
| Renderizar modelo | <100ms |

**Total**: 1-3 segundos para carregar um modelo completo.
