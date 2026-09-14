/* =========================================================
   DULEO - GESTÃO DE INDICADORES
   SCRIPT COMPLETO
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       CONFIGURAÇÕES
    ===================================================== */

    const CHAVE_INDICADORES = "duleo_indicadores";
    const CHAVE_FILIAIS = "duleo_filiais";
    const CHAVE_USUARIOS = "duleo_usuarios";
    const CHAVE_METAS = "duleo_metas";
    const CHAVE_TEMA = "duleo_tema";
    const CHAVE_SESSAO = "duleo_sessao";

    const CATEGORIAS = {
        carregamentos: "Carregamentos",
        separacao: "Separação",
        conformidade: "Conformidade",
        conferencia: "Conferência"
    };

    const PERFIS = {
        coordenador: "Coordenador",
        supervisor: "Supervisor",
        gerente: "Gerente",
        usuario: "Usuário",
        autor: "Autor"
    };


    /* =====================================================
       FUNÇÕES BÁSICAS
    ===================================================== */

    const $ = (seletor) => document.querySelector(seletor);

    const $$ = (seletor) => {
        return Array.from(document.querySelectorAll(seletor));
    };

    function gerarId() {
        return Date.now().toString() + Math.random().toString(36).substring(2, 9);
    }

    function salvar(chave, valor) {
        localStorage.setItem(chave, JSON.stringify(valor));
    }

    function carregar(chave, padrao = []) {
        try {
            const dados = localStorage.getItem(chave);

            if (!dados) {
                return padrao;
            }

            return JSON.parse(dados);
        } catch (erro) {
            console.error("Erro ao carregar dados:", erro);
            return padrao;
        }
    }

    function escaparHTML(valor) {
        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function numero(valor) {
        const n = Number(valor);
        return Number.isFinite(n) ? n : 0;
    }

    function formatarNumero(valor) {
        return numero(valor).toLocaleString("pt-BR", {
            maximumFractionDigits: 2
        });
    }

    function hojeISO() {
        const hoje = new Date();

        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, "0");
        const dia = String(hoje.getDate()).padStart(2, "0");

        return `${ano}-${mes}-${dia}`;
    }

    function mesAtualISO() {
        return hojeISO().substring(0, 7);
    }

    function formatarData(data) {
        if (!data) return "-";

        const partes = data.split("-");

        if (partes.length !== 3) {
            return data;
        }

        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    function obterMes(data) {
        if (!data) return "";
        return String(data).substring(0, 7);
    }

    function mostrarElemento(elemento) {
        if (elemento) {
            elemento.classList.remove("hidden");
        }
    }

    function esconderElemento(elemento) {
        if (elemento) {
            elemento.classList.add("hidden");
        }
    }

    function evento(seletor, eventoNome, funcao) {
        const elemento = $(seletor);

        if (elemento) {
            elemento.addEventListener(eventoNome, funcao);
        }
    }


    /* =====================================================
       TOAST
    ===================================================== */

    function mostrarToast(mensagem, tipo = "normal") {

        const toast = $("#toast");

        if (!toast) return;

        toast.textContent = mensagem;

        toast.className = "toast";

        if (tipo === "erro") {
            toast.classList.add("erro");
        }

        if (tipo === "sucesso") {
            toast.classList.add("sucesso");
        }

        toast.classList.add("ativo");

        setTimeout(() => {
            toast.classList.remove("ativo");
        }, 3000);
    }


    /* =====================================================
       DADOS
    ===================================================== */

    let filiais = carregar(CHAVE_FILIAIS, []);
    let usuarios = carregar(CHAVE_USUARIOS, []);
    let indicadores = carregar(CHAVE_INDICADORES, []);
    let metas = carregar(CHAVE_METAS, []);

    let sessao = carregar(CHAVE_SESSAO, null);


    /* =====================================================
       CRIAÇÃO DOS DADOS INICIAIS
    ===================================================== */

    function prepararDadosIniciais() {

        if (!Array.isArray(filiais)) {
            filiais = [];
        }

        if (!Array.isArray(usuarios)) {
            usuarios = [];
        }

        if (!Array.isArray(indicadores)) {
            indicadores = [];
        }

        if (!Array.isArray(metas)) {
            metas = [];
        }


        /* Filial padrão */

        if (filiais.length === 0) {

            filiais.push({
                id: gerarId(),
                nome: "Matriz"
            });

            salvar(CHAVE_FILIAIS, filiais);
        }


        /* Usuário autor */

        const autorExistente = usuarios.find(
            usuario =>
                String(usuario.nome).toUpperCase() === "MARCO"
        );

        if (!autorExistente) {

            usuarios.push({
                id: gerarId(),
                nome: "MARCO",
                senha: "01022005",
                tipo: "autor",
                autor: true,
                filiais: filiais.map(filial => filial.id)
            });

            salvar(CHAVE_USUARIOS, usuarios);

        } else {

            autorExistente.nome = "MARCO";
            autorExistente.senha = "01022005";
            autorExistente.tipo = "autor";
            autorExistente.autor = true;

            salvar(CHAVE_USUARIOS, usuarios);
        }
    }

    prepararDadosIniciais();


    /* =====================================================
       USUÁRIO LOGADO
    ===================================================== */

    function usuarioLogado() {

        if (!sessao || !sessao.id) {
            return null;
        }

        return usuarios.find(
            usuario => usuario.id === sessao.id
        ) || null;
    }


    function ehAutor() {

        const usuario = usuarioLogado();

        return Boolean(
            usuario &&
            (
                usuario.autor === true ||
                usuario.tipo === "autor"
            )
        );
    }


    function filiaisPermitidas() {

        const usuario = usuarioLogado();

        if (!usuario) {
            return [];
        }

        if (ehAutor()) {
            return filiais;
        }

        const ids = Array.isArray(usuario.filiais)
            ? usuario.filiais
            : [];

        return filiais.filter(
            filial => ids.includes(filial.id)
        );
    }


    function podeAcessarFilial(idFilial) {

        if (ehAutor()) {
            return true;
        }

        const permitidas = filiaisPermitidas();

        return permitidas.some(
            filial => filial.id === idFilial
        );
    }


    /* =====================================================
       LOGIN
    ===================================================== */

    function atualizarFiliaisLogin() {

        const select = $("#loginFilial");

        if (!select) return;

        const valorAtual = select.value;

        select.innerHTML = `
            <option value="">Selecione a filial</option>
            ${filiais.map(filial => `
                <option value="${escaparHTML(filial.id)}">
                    ${escaparHTML(filial.nome)}
                </option>
            `).join("")}
        `;

        if (
            valorAtual &&
            filiais.some(filial => filial.id === valorAtual)
        ) {
            select.value = valorAtual;
        }
    }


    function realizarLogin(eventoForm) {

        eventoForm.preventDefault();

        const usuarioDigitado = $("#loginUsuario")?.value.trim() || "";
        const senhaDigitada = $("#loginSenha")?.value || "";
        const filialSelecionada = $("#loginFilial")?.value || "";

        const mensagem = $("#mensagemLogin");

        if (mensagem) {
            mensagem.textContent = "";
        }


        if (!usuarioDigitado || !senhaDigitada || !filialSelecionada) {

            if (mensagem) {
                mensagem.textContent =
                    "Preencha usuário, senha e filial.";
            }

            return;
        }


        const usuario = usuarios.find(
            item =>
                String(item.nome).toLowerCase() ===
                usuarioDigitado.toLowerCase()
        );


        if (!usuario) {

            if (mensagem) {
                mensagem.textContent =
                    "Usuário ou senha incorretos.";
            }

            return;
        }


        if (String(usuario.senha) !== String(senhaDigitada)) {

            if (mensagem) {
                mensagem.textContent =
                    "Usuário ou senha incorretos.";
            }

            return;
        }


        const acessoPermitido =
            usuario.autor === true ||
            usuario.tipo === "autor" ||
            (Array.isArray(usuario.filiais) &&
                usuario.filiais.includes(filialSelecionada));


        if (!acessoPermitido) {

            if (mensagem) {
                mensagem.textContent =
                    "Este usuário não possui acesso a essa filial.";
            }

            return;
        }


        sessao = {
            id: usuario.id,
            filialId: filialSelecionada
        };

        salvar(CHAVE_SESSAO, sessao);

        mostrarAplicacao();

        mostrarToast("Login realizado com sucesso.", "sucesso");
    }


    function mostrarAplicacao() {

        esconderElemento($("#telaLogin"));
        mostrarElemento($("#aplicacao"));

        atualizarInformacoesUsuario();
        preencherSelectsFiliais();
        atualizarTodasAsTelas();

        abrirPagina("inicio");
    }


    function mostrarLogin() {

        sessao = null;

        localStorage.removeItem(CHAVE_SESSAO);

        mostrarElemento($("#telaLogin"));
        esconderElemento($("#aplicacao"));

        const formulario = $("#formLogin");

        if (formulario) {
            formulario.reset();
        }

        atualizarFiliaisLogin();
    }


    /* =====================================================
       INFORMAÇÕES DO USUÁRIO
    ===================================================== */

    function atualizarInformacoesUsuario() {

        const usuario = usuarioLogado();

        if (!usuario) return;

        const filialAtual = filiais.find(
            filial => filial.id === sessao.filialId
        );


        const nome = $("#nomeUsuarioLogado");
        const tipo = $("#tipoUsuarioLogado");
        const filial = $("#filialUsuarioLogado");
        const avatar = $("#avatarUsuario");
        const badge = $("#badgeFilialAtual");
        const saudacao = $("#saudacaoUsuario");


        if (nome) {
            nome.textContent = usuario.nome;
        }

        if (tipo) {
            tipo.textContent =
                PERFIS[usuario.tipo] || "Usuário";
        }

        if (filial) {
            filial.textContent =
                ehAutor()
                    ? "Autor"
                    : (filialAtual?.nome || "Filial");
        }

        if (badge) {
            badge.textContent =
                filialAtual?.nome || "Todas as filiais";
        }

        if (avatar) {
            avatar.textContent =
                String(usuario.nome).charAt(0).toUpperCase();
        }

        if (saudacao) {
            saudacao.textContent =
                `Olá, ${usuario.nome}! Acompanhe seus resultados.`;
        }


        if (ehAutor()) {
            mostrarElemento($("#filtroFilialAutorInicio"));
            mostrarElemento($("#areaAutor"));
        } else {
            esconderElemento($("#filtroFilialAutorInicio"));
            esconderElemento($("#areaAutor"));
        }
    }


    /* =====================================================
       NAVEGAÇÃO
    ===================================================== */

    const nomesPaginas = {
        inicio: "Início",
        indicadores: "Indicadores",
        geral: "Indicador Geral",
        dashboard: "Dashboard",
        metas: "Metas",
        ia: "Assistente IA",
        relatorios: "Relatórios",
        configuracoes: "Configurações"
    };


    function abrirPagina(nomePagina) {

        const telas = $$(".tela");

        telas.forEach(tela => {
            tela.classList.remove("ativa");
        });


        const tela = document.getElementById(
            `tela-${nomePagina}`
        );

        if (!tela) {
            console.warn(
                "Tela não encontrada:",
                `tela-${nomePagina}`
            );
            return;
        }

        tela.classList.add("ativa");


        $$(".menu-item").forEach(item => {

            item.classList.remove("ativo");

            if (item.dataset.tela === nomePagina) {
                item.classList.add("ativo");
            }
        });


        const titulo = $("#tituloTela");

        if (titulo) {
            titulo.textContent =
                nomesPaginas[nomePagina] || nomePagina;
        }


        fecharMenuMobile();


        if (nomePagina === "inicio") {
            atualizarInicio();
        }

        if (nomePagina === "indicadores") {
            atualizarTabelaIndicadores();
        }

        if (nomePagina === "geral") {
            atualizarIndicadorGeral();
        }

        if (nomePagina === "dashboard") {
            atualizarDashboard();
        }

        if (nomePagina === "metas") {
            atualizarMetas();
        }

        if (nomePagina === "ia") {
            atualizarAnaliseIA();
        }

        if (nomePagina === "relatorios") {
            preencherRelatorioVazio();
        }

        if (nomePagina === "configuracoes") {
            atualizarFiliais();
            atualizarUsuarios();
        }
    }


    $$(".menu-item").forEach(botao => {

        botao.addEventListener("click", () => {

            const pagina =
                botao.dataset.tela;

            if (pagina) {
                abrirPagina(pagina);
            }
        });

    });


    evento("#verTodos", "click", () => {
        abrirPagina("indicadores");
    });


    /* =====================================================
       MENU MOBILE
    ===================================================== */

    function abrirMenuMobile() {

        $("#sidebar")?.classList.add("aberto");
        $("#overlayMenu")?.classList.add("ativo");
    }


    function fecharMenuMobile() {

        $("#sidebar")?.classList.remove("aberto");
        $("#overlayMenu")?.classList.remove("ativo");
    }


    evento("#botaoAbrirMenu", "click", abrirMenuMobile);

    evento("#botaoFecharMenu", "click", fecharMenuMobile);

    evento("#overlayMenu", "click", fecharMenuMobile);


    /* =====================================================
       FILIAIS - SELECTS
    ===================================================== */

    function preencherSelectsFiliais() {

        atualizarFiliaisLogin();

        const usuario = usuarioLogado();

        const listaPermitida = ehAutor()
            ? filiais
            : filiaisPermitidas();


        /* Indicador */

        const selectIndicador = $("#filialIndicador");

        if (selectIndicador) {

            const valorAtual =
                selectIndicador.value;

            selectIndicador.innerHTML = `
                <option value="">Selecione a filial</option>

                ${listaPermitida.map(filial => `
                    <option value="${escaparHTML(filial.id)}">
                        ${escaparHTML(filial.nome)}
                    </option>
                `).join("")}
            `;

            if (
                valorAtual &&
                listaPermitida.some(
                    filial => filial.id === valorAtual
                )
            ) {
                selectIndicador.value = valorAtual;
            }
        }


        /* Meta */

        const selectMeta = $("#filialMeta");

        if (selectMeta) {

            const valorAtual =
                selectMeta.value;

            selectMeta.innerHTML = `
                <option value="">Selecione a filial</option>

                ${listaPermitida.map(filial => `
                    <option value="${escaparHTML(filial.id)}">
                        ${escaparHTML(filial.nome)}
                    </option>
                `).join("")}
            `;

            if (
                valorAtual &&
                listaPermitida.some(
                    filial => filial.id === valorAtual
                )
            ) {
                selectMeta.value = valorAtual;
            }
        }


        /* Geral */

        const selectGeral = $("#filtroFilialGeral");

        if (selectGeral) {

            const valorAtual =
                selectGeral.value || "todas";

            if (ehAutor()) {

                selectGeral.innerHTML = `
                    <option value="todas">
                        Todas as filiais
                    </option>

                    ${filiais.map(filial => `
                        <option value="${escaparHTML(filial.id)}">
                            ${escaparHTML(filial.nome)}
                        </option>
                    `).join("")}
                `;

            } else {

                const filialAtual =
                    filiais.find(
                        filial =>
                            filial.id === sessao.filialId
                    );

                selectGeral.innerHTML = filialAtual
                    ? `
                        <option value="${escaparHTML(filialAtual.id)}">
                            ${escaparHTML(filialAtual.nome)}
                        </option>
                    `
                    : "";

            }

            if (
                [...selectGeral.options]
                    .some(opcao => opcao.value === valorAtual)
            ) {
                selectGeral.value = valorAtual;
            }
        }


        /* IA */

        const selectIA = $("#filtroFilialIA");

        if (selectIA) {

            const valorAtual =
                selectIA.value || "todas";

            if (ehAutor()) {

                selectIA.innerHTML = `
                    <option value="todas">
                        Todas as filiais
                    </option>

                    ${filiais.map(filial => `
                        <option value="${escaparHTML(filial.id)}">
                            ${escaparHTML(filial.nome)}
                        </option>
                    `).join("")}
                `;

            } else {

                const filialAtual =
                    filiais.find(
                        filial =>
                            filial.id === sessao.filialId
                    );

                selectIA.innerHTML = filialAtual
                    ? `
                        <option value="${escaparHTML(filialAtual.id)}">
                            ${escaparHTML(filialAtual.nome)}
                        </option>
                    `
                    : "";
            }

            if (
                [...selectIA.options]
                    .some(opcao => opcao.value === valorAtual)
            ) {
                selectIA.value = valorAtual;
            }
        }


        /* Filtro autor da página inicial */

        const selectInicio =
            $("#seletorFilialAutorInicio");

        if (selectInicio) {

            selectInicio.innerHTML = `
                <option value="todas">
                    Todas as filiais
                </option>

                ${filiais.map(filial => `
                    <option value="${escaparHTML(filial.id)}">
                        ${escaparHTML(filial.nome)}
                    </option>
                `).join("")}
            `;
        }
    }


    /* =====================================================
       FILTRO DE INDICADORES POR FILIAL
    ===================================================== */

    function indicadoresVisiveis() {

        if (ehAutor()) {
            return indicadores;
        }

        return indicadores.filter(
            indicador =>
                indicador.filialId === sessao.filialId
        );
    }


    function metasVisiveis() {

        if (ehAutor()) {
            return metas;
        }

        return metas.filter(
            meta =>
                meta.filialId === sessao.filialId
        );
    }


    /* =====================================================
       STATUS
    ===================================================== */

    function obterStatus(meta, resultado) {

        meta = numero(meta);
        resultado = numero(resultado);

        if (resultado >= meta) {
            return {
                classe: "status-positivo",
                texto: "Atingido"
            };
        }

        if (resultado >= meta * 0.8) {
            return {
                classe: "status-atencao",
                texto: "Atenção"
            };
        }

        return {
            classe: "status-negativo",
            texto: "Crítico"
        };
    }


    /* =====================================================
       INDICADORES
    ===================================================== */

    function abrirNovoIndicador() {

        const formulario = $("#formIndicador");

        if (formulario) {
            formulario.reset();
        }

        $("#idIndicador").value = "";

        $("#tituloModalIndicador").textContent =
            "Novo indicador";

        $("#dataIndicador").value =
            hojeISO();

        preencherSelectsFiliais();


        if (!ehAutor()) {
            $("#filialIndicador").value =
                sessao.filialId;
        }


        atualizarPreviewStatus();

        mostrarElemento($("#modalIndicador"));
    }


    function editarIndicador(id) {

        const indicador =
            indicadores.find(
                item => item.id === id
            );

        if (!indicador) return;

        if (!podeAcessarFilial(indicador.filialId)) {
            mostrarToast(
                "Você não possui acesso a este indicador.",
                "erro"
            );
            return;
        }


        $("#idIndicador").value =
            indicador.id;

        $("#nomeIndicador").value =
            indicador.nome;

        $("#categoriaIndicador").value =
            indicador.categoria;

        $("#dataIndicador").value =
            indicador.data;

        $("#metaIndicador").value =
            indicador.meta;

        $("#resultadoIndicador").value =
            indicador.resultado;

        preencherSelectsFiliais();

        $("#filialIndicador").value =
            indicador.filialId;


        $("#tituloModalIndicador").textContent =
            "Editar indicador";


        atualizarPreviewStatus();

        mostrarElemento($("#modalIndicador"));
    }


    function salvarIndicador(eventoForm) {

        eventoForm.preventDefault();

        const id = $("#idIndicador").value;

        const nome =
            $("#nomeIndicador").value.trim();

        const categoria =
            $("#categoriaIndicador").value;

        const data =
            $("#dataIndicador").value;

        const meta =
            numero($("#metaIndicador").value);

        const resultado =
            numero($("#resultadoIndicador").value);

        const filialId =
            $("#filialIndicador").value;


        if (
            !nome ||
            !categoria ||
            !data ||
            !filialId
        ) {
            mostrarToast(
                "Preencha todos os campos obrigatórios.",
                "erro"
            );
            return;
        }


        if (!podeAcessarFilial(filialId)) {
            mostrarToast(
                "Você não pode cadastrar nesta filial.",
                "erro"
            );
            return;
        }


        if (meta < 0 || meta > 100) {
            mostrarToast(
                "A meta deve estar entre 0% e 100%.",
                "erro"
            );
            return;
        }


        if (resultado < 0 || resultado > 100) {
            mostrarToast(
                "O resultado deve estar entre 0% e 100%.",
                "erro"
            );
            return;
        }


        if (id) {

            const indicador =
                indicadores.find(
                    item => item.id === id
                );

            if (!indicador) return;

            indicador.nome = nome;
            indicador.categoria = categoria;
            indicador.data = data;
            indicador.meta = meta;
            indicador.resultado = resultado;
            indicador.filialId = filialId;
            indicador.atualizadoEm = new Date().toISOString();

            mostrarToast(
                "Indicador atualizado.",
                "sucesso"
            );

        } else {

            indicadores.push({

                id: gerarId(),

                nome,

                categoria,

                data,

                meta,

                resultado,

                filialId,

                criadoEm: new Date().toISOString(),

                atualizadoEm: new Date().toISOString()
            });

            mostrarToast(
                "Indicador cadastrado.",
                "sucesso"
            );
        }


        salvar(
            CHAVE_INDICADORES,
            indicadores
        );

        fecharModal("#modalIndicador");

        atualizarTodasAsTelas();
    }


    function atualizarPreviewStatus() {

        const preview =
            $("#previewStatus");

        if (!preview) return;

        const meta =
            numero($("#metaIndicador")?.value);

        const resultado =
            numero($("#resultadoIndicador")?.value);


        if (
            !$("#metaIndicador")?.value ||
            !$("#resultadoIndicador")?.value
        ) {

            preview.textContent =
                "O status aparecerá aqui conforme você preencher meta e resultado.";

            return;
        }


        const status =
            obterStatus(meta, resultado);


        preview.innerHTML = `
            <strong>${escaparHTML(status.texto)}</strong>
            — Meta: ${formatarNumero(meta)}%
            | Resultado: ${formatarNumero(resultado)}%
        `;

        preview.className =
            `preview-status ${status.classe}`;
    }


    function excluirIndicador(id) {

        const indicador =
            indicadores.find(
                item => item.id === id
            );

        if (!indicador) return;

        if (!podeAcessarFilial(indicador.filialId)) {
            mostrarToast(
                "Você não possui acesso a este indicador.",
                "erro"
            );
            return;
        }


        const confirmar =
            confirm(
                `Deseja realmente excluir o indicador "${indicador.nome}"?`
            );

        if (!confirmar) return;


        indicadores =
            indicadores.filter(
                item => item.id !== id
            );

        salvar(
            CHAVE_INDICADORES,
            indicadores
        );

        mostrarToast(
            "Indicador excluído.",
            "sucesso"
        );

        atualizarTodasAsTelas();
    }


    function atualizarTabelaIndicadores() {

        const container =
            $("#tabelaIndicadores");

        if (!container) return;


        let dados =
            indicadoresVisiveis();


        const categoria =
            $("#filtroCategoria")?.value || "todas";


        if (categoria !== "todas") {

            dados =
                dados.filter(
                    indicador =>
                        indicador.categoria === categoria
                );
        }


        dados =
            [...dados].sort(
                (a, b) =>
                    new Date(b.data) -
                    new Date(a.data)
            );


        if (dados.length === 0) {

            container.innerHTML = `
                <div class="estado-vazio">
                    Nenhum indicador encontrado.
                </div>
            `;

            return;
        }


        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Indicador</th>
                        <th>Categoria</th>
                        <th>Filial</th>
                        <th>Data</th>
                        <th>Meta</th>
                        <th>Resultado</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>

                <tbody>

                    ${dados.map(indicador => {

                        const filial =
                            filiais.find(
                                item =>
                                    item.id === indicador.filialId
                            );

                        const status =
                            obterStatus(
                                indicador.meta,
                                indicador.resultado
                            );

                        return `
                            <tr>

                                <td>
                                    <strong>
                                        ${escaparHTML(indicador.nome)}
                                    </strong>
                                </td>

                                <td>
                                    ${escaparHTML(
                                        CATEGORIAS[indicador.categoria] ||
                                        indicador.categoria
                                    )}
                                </td>

                                <td>
                                    ${escaparHTML(
                                        filial?.nome || "-"
                                    )}
                                </td>

                                <td>
                                    ${formatarData(indicador.data)}
                                </td>

                                <td>
                                    ${formatarNumero(indicador.meta)}%
                                </td>

                                <td>
                                    ${formatarNumero(indicador.resultado)}%
                                </td>

                                <td>
                                    <span class="${status.classe}">
                                        ${escaparHTML(status.texto)}
                                    </span>
                                </td>

                                <td>

                                    <div class="acoes-tabela">

                                        <button
                                            class="btn btn-secondary"
                                            onclick="verDetalhesIndicador('${indicador.id}')"
                                        >
                                            Detalhes
                                        </button>

                                        <button
                                            class="btn btn-primary"
                                            onclick="editarIndicador('${indicador.id}')"
                                        >
                                            Editar
                                        </button>

                                        <button
                                            class="btn btn-danger"
                                            onclick="excluirIndicador('${indicador.id}')"
                                        >
                                            Excluir
                                        </button>

                                    </div>

                                </td>

                            </tr>
                        `;

                    }).join("")}

                </tbody>
            </table>
        `;
    }


    /* =====================================================
       DETALHES
    ===================================================== */

    function verDetalhesIndicador(id) {

        const indicador =
            indicadores.find(
                item => item.id === id
            );

        if (!indicador) return;

        if (!podeAcessarFilial(indicador.filialId)) {
            mostrarToast(
                "Você não possui acesso a este indicador.",
                "erro"
            );
            return;
        }


        const filial =
            filiais.find(
                item => item.id === indicador.filialId
            );


        const status =
            obterStatus(
                indicador.meta,
                indicador.resultado
            );


        const diferenca =
            numero(indicador.resultado) -
            numero(indicador.meta);


        $("#conteudoDetalhes").innerHTML = `

            <div class="detalhes-grid">

                <div class="detalhe-item">
                    <span>Indicador</span>
                    <strong>
                        ${escaparHTML(indicador.nome)}
                    </strong>
                </div>

                <div class="detalhe-item">
                    <span>Categoria</span>
                    <strong>
                        ${escaparHTML(
                            CATEGORIAS[indicador.categoria] ||
                            indicador.categoria
                        )}
                    </strong>
                </div>

                <div class="detalhe-item">
                    <span>Filial</span>
                    <strong>
                        ${escaparHTML(
                            filial?.nome || "-"
                        )}
                    </strong>
                </div>

                <div class="detalhe-item">
                    <span>Data</span>
                    <strong>
                        ${formatarData(indicador.data)}
                    </strong>
                </div>

                <div class="detalhe-item">
                    <span>Meta</span>
                    <strong>
                        ${formatarNumero(indicador.meta)}%
                    </strong>
                </div>

                <div class="detalhe-item">
                    <span>Resultado</span>
                    <strong>
                        ${formatarNumero(indicador.resultado)}%
                    </strong>
                </div>

                <div class="detalhe-item">
                    <span>Diferença</span>
                    <strong>
                        ${diferenca >= 0 ? "+" : ""}
                        ${formatarNumero(diferenca)}%
                    </strong>
                </div>

                <div class="detalhe-item">
                    <span>Status</span>
                    <strong class="${status.classe}">
                        ${escaparHTML(status.texto)}
                    </strong>
                </div>

            </div>
        `;


        mostrarElemento($("#modalDetalhes"));
    }


    /* =====================================================
       INÍCIO
    ===================================================== */

    function obterIndicadoresInicio() {

        let dados =
            indicadoresVisiveis();


        if (ehAutor()) {

            const filialSelecionada =
                $("#seletorFilialAutorInicio")?.value ||
                "todas";


            if (filialSelecionada !== "todas") {

                dados =
                    dados.filter(
                        indicador =>
                            indicador.filialId ===
                            filialSelecionada
                    );
            }
        }


        return dados;
    }


    function atualizarInicio() {

        const dados =
            obterIndicadoresInicio();


        const total =
            dados.length;


        const media =
            total
                ? dados.reduce(
                    (soma, item) =>
                        soma + numero(item.resultado),
                    0
                ) / total
                : 0;


        const criticos =
            dados.filter(
                item =>
                    numero(item.resultado) <
                    numero(item.meta)
            ).length;


        const atingidos =
            dados.filter(
                item =>
                    numero(item.resultado) >=
                    numero(item.meta)
            ).length;


        const conformidade =
            total
                ? (atingidos / total) * 100
                : 0;


        $("#totalIndicadores").textContent =
            total;

        $("#mediaIndicadores").textContent =
            `${formatarNumero(media)}%`;

        $("#indicadoresCriticos").textContent =
            criticos;

        $("#conformidadeInicio").textContent =
            `${formatarNumero(conformidade)}%`;


        atualizarGrafico(
            $("#graficoInicio"),
            dados
        );

        atualizarStatusInicio(
            dados
        );

        atualizarIndicadoresRecentes(
            dados
        );
    }


    function atualizarStatusInicio(dados) {

        const container =
            $("#statusInicio");

        if (!container) return;


        const total =
            dados.length;

        const atingidos =
            dados.filter(
                item =>
                    numero(item.resultado) >=
                    numero(item.meta)
            ).length;

        const atencao =
            dados.filter(
                item => {

                    const resultado =
                        numero(item.resultado);

                    const meta =
                        numero(item.meta);

                    return (
                        resultado < meta &&
                        resultado >= meta * 0.8
                    );
                }
            ).length;

        const criticos =
            dados.filter(
                item =>
                    numero(item.resultado) <
                    numero(item.meta) * 0.8
            ).length;


        if (!total) {

            container.innerHTML = `
                <div class="estado-vazio">
                    Nenhum indicador cadastrado.
                </div>
            `;

            return;
        }


        container.innerHTML = `

            <div class="status-lista">

                <div class="status-linha">
                    <span>
                        <i class="status-ponto positivo"></i>
                        Atingidos
                    </span>

                    <strong>${atingidos}</strong>
                </div>

                <div class="status-linha">
                    <span>
                        <i class="status-ponto atencao"></i>
                        Em atenção
                    </span>

                    <strong>${atencao}</strong>
                </div>

                <div class="status-linha">
                    <span>
                        <i class="status-ponto negativo"></i>
                        Críticos
                    </span>

                    <strong>${criticos}</strong>
                </div>

            </div>
        `;
    }


    function atualizarIndicadoresRecentes(dados) {

        const container =
            $("#indicadoresRecentes");

        if (!container) return;


        const recentes =
            [...dados]
                .sort(
                    (a, b) =>
                        new Date(b.data) -
                        new Date(a.data)
                )
                .slice(0, 5);


        if (!recentes.length) {

            container.innerHTML = `
                <div class="estado-vazio">
                    Nenhum indicador cadastrado.
                </div>
            `;

            return;
        }


        container.innerHTML = `

            <div class="lista-recentes">

                ${recentes.map(indicador => {

                    const filial =
                        filiais.find(
                            item =>
                                item.id ===
                                indicador.filialId
                        );

                    const status =
                        obterStatus(
                            indicador.meta,
                            indicador.resultado
                        );

                    return `

                        <div class="item-recente">

                            <div>

                                <strong>
                                    ${escaparHTML(indicador.nome)}
                                </strong>

                                <span>
                                    ${escaparHTML(
                                        CATEGORIAS[indicador.categoria] ||
                                        indicador.categoria
                                    )}
                                    •
                                    ${escaparHTML(
                                        filial?.nome || "-"
                                    )}
                                </span>

                            </div>

                            <div>

                                <strong>
                                    ${formatarNumero(
                                        indicador.resultado
                                    )}%
                                </strong>

                                <span class="${status.classe}">
                                    ${escaparHTML(status.texto)}
                                </span>

                            </div>

                        </div>

                    `;

                }).join("")}

            </div>
        `;
    }


    /* =====================================================
       GRÁFICOS
    ===================================================== */

    function calcularMediasCategorias(dados) {

        return Object.keys(CATEGORIAS).map(categoria => {

            const itens =
                dados.filter(
                    item =>
                        item.categoria === categoria
                );


            const media =
                itens.length
                    ? itens.reduce(
                        (soma, item) =>
                            soma + numero(item.resultado),
                        0
                    ) / itens.length
                    : 0;


            return {
                categoria,
                nome: CATEGORIAS[categoria],
                media
            };
        });
    }


    function atualizarGrafico(container, dados) {

        if (!container) return;


        const categorias =
            calcularMediasCategorias(dados);


        container.innerHTML = `

            <div class="barras-container">

                ${categorias.map(item => `

                    <div class="barra-item">

                        <div class="barra-topo">

                            <span>
                                ${escaparHTML(item.nome)}
                            </span>

                            <strong>
                                ${formatarNumero(item.media)}%
                            </strong>

                        </div>

                        <div class="barra-fundo">

                            <div
                                class="barra-preenchida"
                                style="width:${Math.min(
                                    100,
                                    Math.max(0, item.media)
                                )}%"
                            ></div>

                        </div>

                    </div>

                `).join("")}

            </div>
        `;
    }


    /* =====================================================
       INDICADOR GERAL
    ===================================================== */

    function atualizarIndicadorGeral() {

        const mes =
            $("#filtroMesGeral")?.value ||
            mesAtualISO();


        let dados =
            indicadoresVisiveis();


        if (ehAutor()) {

            const filial =
                $("#filtroFilialGeral")?.value ||
                "todas";


            if (filial !== "todas") {

                dados =
                    dados.filter(
                        indicador =>
                            indicador.filialId === filial
                    );
            }
        }


        dados =
            dados.filter(
                indicador =>
                    obterMes(indicador.data) === mes
            );


        const total =
            dados.length;


        const resultado =
            total
                ? dados.reduce(
                    (soma, item) =>
                        soma + numero(item.resultado),
                    0
                ) / total
                : 0;


        const meta =
            total
                ? dados.reduce(
                    (soma, item) =>
                        soma + numero(item.meta),
                    0
                ) / total
                : 0;


        $("#valorGeral").textContent =
            `${formatarNumero(resultado)}%`;

        $("#geralTotal").textContent =
            total;

        $("#geralMeta").textContent =
            `${formatarNumero(meta)}%`;

        $("#geralResultado").textContent =
            `${formatarNumero(resultado)}%`;


        $("#descricaoGeral").textContent =
            total
                ? `Média de ${total} indicador(es) no período selecionado.`
                : "Nenhum indicador encontrado para este período.";


        atualizarTabelaGeral(dados);
    }


    function atualizarTabelaGeral(dados) {

        const container =
            $("#tabelaGeral");

        if (!container) return;


        if (!dados.length) {

            container.innerHTML = `
                <div class="estado-vazio">
                    Nenhum indicador encontrado neste período.
                </div>
            `;

            return;
        }


        container.innerHTML = `

            <table>

                <thead>

                    <tr>
                        <th>Indicador</th>
                        <th>Categoria</th>
                        <th>Filial</th>
                        <th>Meta</th>
                        <th>Resultado</th>
                        <th>Status</th>
                    </tr>

                </thead>

                <tbody>

                    ${dados.map(indicador => {

                        const filial =
                            filiais.find(
                                item =>
                                    item.id ===
                                    indicador.filialId
                            );

                        const status =
                            obterStatus(
                                indicador.meta,
                                indicador.resultado
                            );

                        return `
                            <tr>

                                <td>
                                    <strong>
                                        ${escaparHTML(
                                            indicador.nome
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    ${escaparHTML(
                                        CATEGORIAS[indicador.categoria] ||
                                        indicador.categoria
                                    )}
                                </td>

                                <td>
                                    ${escaparHTML(
                                        filial?.nome || "-"
                                    )}
                                </td>

                                <td>
                                    ${formatarNumero(
                                        indicador.meta
                                    )}%
                                </td>

                                <td>
                                    ${formatarNumero(
                                        indicador.resultado
                                    )}%
                                </td>

                                <td>
                                    <span class="${status.classe}">
                                        ${escaparHTML(
                                            status.texto
                                        )}
                                    </span>
                                </td>

                            </tr>
                        `;

                    }).join("")}

                </tbody>

            </table>
        `;
    }


    /* =====================================================
       DASHBOARD
    ===================================================== */

    function atualizarDashboard() {

        const dados =
            indicadoresVisiveis();


        const total =
            dados.length;


        const media =
            total
                ? dados.reduce(
                    (soma, item) =>
                        soma + numero(item.resultado),
                    0
                ) / total
                : 0;


        const criticos =
            dados.filter(
                item =>
                    numero(item.resultado) <
                    numero(item.meta)
            ).length;


        const conformidade =
            total
                ? dados.filter(
                    item =>
                        numero(item.resultado) >=
                        numero(item.meta)
                ).length / total * 100
                : 0;


        $("#dashboardTotal").textContent =
            total;

        $("#dashboardMedia").textContent =
            `${formatarNumero(media)}%`;

        $("#dashboardCriticos").textContent =
            criticos;

        $("#dashboardConformidade").textContent =
            `${formatarNumero(conformidade)}%`;


        atualizarGrafico(
            $("#graficoDashboard"),
            dados
        );
    }


    /* =====================================================
       METAS
    ===================================================== */

    function abrirNovaMeta() {

        $("#formMeta")?.reset();

        $("#idMeta").value = "";

        $("#tituloModalMeta").textContent =
            "Nova meta";

        preencherSelectsFiliais();

        if (!ehAutor()) {
            $("#filialMeta").value =
                sessao.filialId;
        }

        mostrarElemento($("#modalMeta"));
    }


    function editarMeta(id) {

        const meta =
            metas.find(
                item => item.id === id
            );

        if (!meta) return;


        if (!podeAcessarFilial(meta.filialId)) {
            mostrarToast(
                "Você não possui acesso a esta meta.",
                "erro"
            );
            return;
        }


        $("#idMeta").value =
            meta.id;

        $("#nomeMeta").value =
            meta.nome;

        $("#valorMeta").value =
            meta.valor;

        $("#descricaoMeta").value =
            meta.descricao || "";


        preencherSelectsFiliais();

        $("#filialMeta").value =
            meta.filialId;


        $("#tituloModalMeta").textContent =
            "Editar meta";


        mostrarElemento($("#modalMeta"));
    }


    function salvarMeta(eventoForm) {

        eventoForm.preventDefault();


        const id =
            $("#idMeta").value;

        const nome =
            $("#nomeMeta").value.trim();

        const valor =
            numero($("#valorMeta").value);

        const descricao =
            $("#descricaoMeta").value.trim();

        const filialId =
            $("#filialMeta").value;


        if (!nome || !filialId) {

            mostrarToast(
                "Preencha os campos obrigatórios.",
                "erro"
            );

            return;
        }


        if (valor < 0 || valor > 100) {

            mostrarToast(
                "O valor da meta deve estar entre 0% e 100%.",
                "erro"
            );

            return;
        }


        if (!podeAcessarFilial(filialId)) {

            mostrarToast(
                "Você não pode cadastrar nesta filial.",
                "erro"
            );

            return;
        }


        if (id) {

            const meta =
                metas.find(
                    item => item.id === id
                );

            if (!meta) return;

            meta.nome = nome;
            meta.valor = valor;
            meta.descricao = descricao;
            meta.filialId = filialId;

            mostrarToast(
                "Meta atualizada.",
                "sucesso"
            );

        } else {

            metas.push({

                id: gerarId(),

                nome,

                valor,

                descricao,

                filialId,

                criadoEm: new Date().toISOString()
            });

            mostrarToast(
                "Meta cadastrada.",
                "sucesso"
            );
        }


        salvar(
            CHAVE_METAS,
            metas
        );

        fecharModal("#modalMeta");

        atualizarMetas();
    }


    function excluirMeta(id) {

        const meta =
            metas.find(
                item => item.id === id
            );

        if (!meta) return;


        if (!podeAcessarFilial(meta.filialId)) {
            mostrarToast(
                "Você não possui acesso a esta meta.",
                "erro"
            );
            return;
        }


        if (!confirm(
            `Deseja excluir a meta "${meta.nome}"?`
        )) {
            return;
        }


        metas =
            metas.filter(
                item => item.id !== id
            );

        salvar(
            CHAVE_METAS,
            metas
        );


        mostrarToast(
            "Meta excluída.",
            "sucesso"
        );


        atualizarMetas();
    }


    function atualizarMetas() {

        const container =
            $("#listaMetas");

        if (!container) return;


        const dados =
            metasVisiveis();


        if (!dados.length) {

            container.innerHTML = `
                <div class="estado-vazio">
                    Nenhuma meta cadastrada.
                </div>
            `;

            return;
        }


        container.innerHTML = `

            ${dados.map(meta => {

                const filial =
                    filiais.find(
                        item =>
                            item.id === meta.filialId
                    );


                return `

                    <article class="meta-card">

                        <div class="meta-card-top">

                            <div>
                                <span class="eyebrow">
                                    META
                                </span>

                                <h3>
                                    ${escaparHTML(meta.nome)}
                                </h3>
                            </div>

                            <strong>
                                ${formatarNumero(meta.valor)}%
                            </strong>

                        </div>

                        <p>
                            ${escaparHTML(
                                meta.descricao ||
                                "Sem descrição."
                            )}
                        </p>

                        <span class="badge-filiais">
                            ${escaparHTML(
                                filial?.nome || "-"
                            )}
                        </span>

                        <div class="acoes-tabela">

                            <button
                                class="btn btn-primary"
                                onclick="editarMeta('${meta.id}')"
                            >
                                Editar
                            </button>

                            <button
                                class="btn btn-danger"
                                onclick="excluirMeta('${meta.id}')"
                            >
                                Excluir
                            </button>

                        </div>

                    </article>

                `;

            }).join("")}

        `;
    }


    /* =====================================================
       ASSISTENTE IA
    ===================================================== */

    function obterDadosIA() {

        let dados =
            indicadoresVisiveis();


        const filial =
            $("#filtroFilialIA")?.value ||
            "todas";


        const mes =
            $("#filtroMesIA")?.value ||
            mesAtualISO();


        if (ehAutor() && filial !== "todas") {

            dados =
                dados.filter(
                    item =>
                        item.filialId === filial
                );
        }


        if (!ehAutor()) {

            dados =
                dados.filter(
                    item =>
                        item.filialId === sessao.filialId
                );
        }


        dados =
            dados.filter(
                item =>
                    obterMes(item.data) === mes
            );


        return dados;
    }


    function atualizarAnaliseIA() {

        const dados =
            obterDadosIA();


        const total =
            dados.length;


        const media =
            total
                ? dados.reduce(
                    (soma, item) =>
                        soma + numero(item.resultado),
                    0
                ) / total
                : 0;


        const criticos =
            dados.filter(
                item =>
                    numero(item.resultado) <
                    numero(item.meta)
            );


        const atingidos =
            dados.filter(
                item =>
                    numero(item.resultado) >=
                    numero(item.meta)
            ).length;


        const atingimento =
            total
                ? (atingidos / total) * 100
                : 0;


        $("#iaTotal").textContent =
            total;

        $("#iaMedia").textContent =
            `${formatarNumero(media)}%`;

        $("#iaCriticos").textContent =
            criticos.length;

        $("#iaAtingimento").textContent =
            `${formatarNumero(atingimento)}%`;


        gerarResumoIA(
            dados,
            media,
            criticos,
            atingimento
        );

        gerarRecomendacoesIA(
            dados,
            criticos
        );

        gerarCriticosIA(
            criticos
        );

        gerarTendenciasIA(
            dados
        );
    }


    function gerarResumoIA(
        dados,
        media,
        criticos,
        atingimento
    ) {

        const elemento =
            $("#iaResumo");

        if (!elemento) return;


        if (!dados.length) {

            elemento.innerHTML = `
                <p>
                    Não existem indicadores cadastrados
                    para os filtros selecionados.
                </p>
            `;

            return;
        }


        let texto = "";


        if (media >= 90) {

            texto =
                "O desempenho geral está muito bom. " +
                "Os resultados apresentam uma média elevada " +
                "no período analisado.";

        } else if (media >= 80) {

            texto =
                "O desempenho geral está satisfatório, " +
                "mas existem oportunidades de melhoria " +
                "em alguns indicadores.";

        } else {

            texto =
                "O desempenho geral merece atenção. " +
                "A média dos resultados está abaixo de um " +
                "nível considerado satisfatório.";
        }


        if (criticos.length > 0) {

            texto +=
                ` Foram identificados ${criticos.length} ` +
                `indicador(es) abaixo da meta.`;
        } else {

            texto +=
                " Nenhum indicador está abaixo da meta.";
        }


        texto +=
            ` O atingimento das metas está em ` +
            `${formatarNumero(atingimento)}%.`;


        elemento.innerHTML = `
            <p>${escaparHTML(texto)}</p>
        `;
    }


    function gerarRecomendacoesIA(
        dados,
        criticos
    ) {

        const elemento =
            $("#iaRecomendacoes");

        if (!elemento) return;


        if (!dados.length) {

            elemento.innerHTML =
                "Nenhuma recomendação disponível.";

            return;
        }


        const recomendacoes = [];


        if (criticos.length > 0) {

            recomendacoes.push(
                "Priorizar os indicadores que estão abaixo da meta."
            );
        }


        const categorias =
            calcularMediasCategorias(dados);


        const piorCategoria =
            [...categorias]
                .filter(item => item.media > 0)
                .sort(
                    (a, b) =>
                        a.media - b.media
                )[0];


        if (piorCategoria) {

            recomendacoes.push(
                `Avaliar a categoria ${piorCategoria.nome}, ` +
                `que apresentou média de ` +
                `${formatarNumero(piorCategoria.media)}%.`
            );
        }


        if (criticos.length === 0) {

            recomendacoes.push(
                "Manter o acompanhamento periódico dos indicadores."
            );
        }


        elemento.innerHTML = `

            <ul class="lista-recomendacoes">

                ${recomendacoes.map(
                    recomendacao => `
                        <li>
                            ${escaparHTML(recomendacao)}
                        </li>
                    `
                ).join("")}

            </ul>
        `;
    }


    function gerarCriticosIA(criticos) {

        const elemento =
            $("#iaCriticosLista");

        if (!elemento) return;


        if (!criticos.length) {

            elemento.innerHTML = `
                <div class="estado-vazio">
                    Nenhum indicador crítico encontrado.
                </div>
            `;

            return;
        }


        elemento.innerHTML = `

            <div class="ia-lista">

                ${criticos.map(indicador => {

                    const filial =
                        filiais.find(
                            item =>
                                item.id ===
                                indicador.filialId
                        );


                    return `

                        <div class="ia-item">

                            <div>

                                <strong>
                                    ${escaparHTML(
                                        indicador.nome
                                    )}
                                </strong>

                                <span>
                                    Meta:
                                    ${formatarNumero(
                                        indicador.meta
                                    )}%
                                    •
                                    Resultado:
                                    ${formatarNumero(
                                        indicador.resultado
                                    )}%
                                </span>

                            </div>

                            <small>
                                ${escaparHTML(
                                    filial?.nome || "-"
                                )}
                            </small>

                        </div>

                    `;

                }).join("")}

            </div>
        `;
    }


    function gerarTendenciasIA(dados) {

        const elemento =
            $("#iaTendencias");

        if (!elemento) return;


        if (!dados.length) {

            elemento.innerHTML =
                "Sem dados para tendência.";

            return;
        }


        const categorias =
            calcularMediasCategorias(dados)
                .filter(
                    item => item.media > 0
                )
                .sort(
                    (a, b) =>
                        b.media - a.media
                );


        if (!categorias.length) {

            elemento.innerHTML =
                "Sem dados para tendência.";

            return;
        }


        elemento.innerHTML = `

            <div class="ia-lista">

                ${categorias.map(
                    item => `

                        <div class="ia-item">

                            <div>
                                <strong>
                                    ${escaparHTML(item.nome)}
                                </strong>

                                <span>
                                    Média dos resultados
                                </span>
                            </div>

                            <strong>
                                ${formatarNumero(
                                    item.media
                                )}%
                            </strong>

                        </div>

                    `
                ).join("")}

            </div>
        `;
    }


    /* =====================================================
       RELATÓRIO
    ===================================================== */

    function preencherRelatorioVazio() {

        const elemento =
            $("#relatorioResultado");

        if (!elemento) return;

        if (!elemento.dataset.gerado) {

            elemento.innerHTML = `
                <div class="relatorio-vazio">
                    Clique em "Gerar relatório" para criar o resumo.
                </div>
            `;
        }
    }


    function gerarRelatorio() {

        const dados =
            indicadoresVisiveis();


        const total =
            dados.length;


        const media =
            total
                ? dados.reduce(
                    (soma, item) =>
                        soma + numero(item.resultado),
                    0
                ) / total
                : 0;


        const atingidos =
            dados.filter(
                item =>
                    numero(item.resultado) >=
                    numero(item.meta)
            ).length;


        const criticos =
            dados.filter(
                item =>
                    numero(item.resultado) <
                    numero(item.meta)
            ).length;


        const conformidade =
            total
                ? atingidos / total * 100
                : 0;


        const filial =
            filiais.find(
                item =>
                    item.id === sessao?.filialId
            );


        const elemento =
            $("#relatorioResultado");

        if (!elemento) return;


        elemento.dataset.gerado = "true";


        elemento.innerHTML = `

            <div class="relatorio-conteudo">

                <div class="relatorio-info">

                    <div>
                        <span>Filial</span>

                        <strong>
                            ${escaparHTML(
                                ehAutor()
                                    ? "Todas / visão autorizada"
                                    : filial?.nome || "-"
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Data</span>

                        <strong>
                            ${formatarData(hojeISO())}
                        </strong>
                    </div>

                </div>


                <div class="relatorio-cards">

                    <div>
                        <span>Total</span>
                        <strong>${total}</strong>
                    </div>

                    <div>
                        <span>Média</span>
                        <strong>
                            ${formatarNumero(media)}%
                        </strong>
                    </div>

                    <div>
                        <span>Atingidos</span>
                        <strong>
                            ${atingidos}
                        </strong>
                    </div>

                    <div>
                        <span>Críticos</span>
                        <strong>
                            ${criticos}
                        </strong>
                    </div>

                </div>


                <div class="relatorio-texto">

                    <h3>Resumo</h3>

                    <p>
                        Foram analisados
                        <strong>${total}</strong>
                        indicador(es).
                        A média dos resultados foi de
                        <strong>${formatarNumero(media)}%</strong>.
                        O índice de atingimento das metas foi de
                        <strong>${formatarNumero(conformidade)}%</strong>.
                    </p>

                </div>

            </div>
        `;
    }


    /* =====================================================
       FILIAIS - TABELA ORGANIZADA
    ===================================================== */

    function atualizarFiliais() {

        const container =
            $("#listaFiliais");

        if (!container) return;


        if (!filiais.length) {

            container.innerHTML = `
                <div class="estado-vazio">
                    Nenhuma filial cadastrada.
                </div>
            `;

            return;
        }


        container.innerHTML = `

            <table>

                <thead>

                    <tr>
                        <th>Filial</th>
                        <th>Ações</th>
                    </tr>

                </thead>

                <tbody>

                    ${filiais.map(filial => `

                        <tr>

                            <td>
                                <strong>
                                    ${escaparHTML(
                                        filial.nome
                                    )}
                                </strong>
                            </td>

                            <td>

                                <div class="acoes-tabela">

                                    <button
                                        class="btn btn-secondary"
                                        onclick="editarFilial('${filial.id}')"
                                    >
                                        Editar
                                    </button>

                                    <button
                                        class="btn btn-danger"
                                        onclick="excluirFilial('${filial.id}')"
                                    >
                                        Excluir
                                    </button>

                                </div>

                            </td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>
        `;
    }


    function abrirNovaFilial() {

        $("#formFilial")?.reset();

        $("#idFilial").value = "";

        $("#tituloModalFilial").textContent =
            "Nova filial";

        mostrarElemento($("#modalFilial"));
    }


    function editarFilial(id) {

        const filial =
            filiais.find(
                item => item.id === id
            );

        if (!filial) return;


        $("#idFilial").value =
            filial.id;

        $("#nomeFilial").value =
            filial.nome;

        $("#tituloModalFilial").textContent =
            "Editar filial";


        mostrarElemento($("#modalFilial"));
    }


    function salvarFilial(eventoForm) {

        eventoForm.preventDefault();


        const id =
            $("#idFilial").value;

        const nome =
            $("#nomeFilial").value.trim();


        if (!nome) {

            mostrarToast(
                "Digite o nome da filial.",
                "erro"
            );

            return;
        }


        const nomeExiste =
            filiais.some(
                filial =>
                    filial.id !== id &&
                    filial.nome.toLowerCase() ===
                    nome.toLowerCase()
            );


        if (nomeExiste) {

            mostrarToast(
                "Já existe uma filial com esse nome.",
                "erro"
            );

            return;
        }


        if (id) {

            const filial =
                filiais.find(
                    item => item.id === id
                );

            if (!filial) return;

            filial.nome = nome;


            mostrarToast(
                "Filial atualizada.",
                "sucesso"
            );

        } else {

            filiais.push({
                id: gerarId(),
                nome
            });


            mostrarToast(
                "Filial cadastrada.",
                "sucesso"
            );
        }


        salvar(
            CHAVE_FILIAIS,
            filiais
        );


        preencherSelectsFiliais();

        atualizarFiliais();

        atualizarUsuarios();

        atualizarFiliaisLogin();

        fecharModal("#modalFilial");
    }


    function excluirFilial(id) {

        if (filiais.length <= 1) {

            mostrarToast(
                "O sistema precisa ter pelo menos uma filial.",
                "erro"
            );

            return;
        }


        const filial =
            filiais.find(
                item => item.id === id
            );

        if (!filial) return;


        const possuiIndicadores =
            indicadores.some(
                indicador =>
                    indicador.filialId === id
            );


        const possuiMetas =
            metas.some(
                meta =>
                    meta.filialId === id
            );


        if (possuiIndicadores || possuiMetas) {

            mostrarToast(
                "Não é possível excluir uma filial que possui indicadores ou metas.",
                "erro"
            );

            return;
        }


        if (!confirm(
            `Deseja excluir a filial "${filial.nome}"?`
        )) {
            return;
        }


        filiais =
            filiais.filter(
                item => item.id !== id
            );


        usuarios.forEach(usuario => {

            if (Array.isArray(usuario.filiais)) {

                usuario.filiais =
                    usuario.filiais.filter(
                        filialId =>
                            filialId !== id
                    );
            }
        });


        salvar(
            CHAVE_FILIAIS,
            filiais
        );

        salvar(
            CHAVE_USUARIOS,
            usuarios
        );


        preencherSelectsFiliais();

        atualizarFiliais();

        atualizarUsuarios();

        atualizarFiliaisLogin();


        mostrarToast(
            "Filial excluída.",
            "sucesso"
        );
    }


    /* =====================================================
       USUÁRIOS - TABELA ORGANIZADA
    ===================================================== */

    function atualizarUsuarios() {

        const container =
            $("#tabelaUsuarios");

        if (!container) return;


        if (!usuarios.length) {

            container.innerHTML = `
                <div class="estado-vazio">
                    Nenhum usuário cadastrado.
                </div>
            `;

            return;
        }


        container.innerHTML = `

            <table>

                <thead>

                    <tr>
                        <th>Usuário</th>
                        <th>Perfil</th>
                        <th>Filiais autorizadas</th>
                        <th>Ações</th>
                    </tr>

                </thead>

                <tbody>

                    ${usuarios.map(usuario => {

                        const autor =
                            usuario.autor === true ||
                            usuario.tipo === "autor";


                        let nomesFiliais;


                        if (autor) {

                            nomesFiliais =
                                "Todas as filiais";

                        } else {

                            nomesFiliais =
                                (Array.isArray(usuario.filiais)
                                    ? usuario.filiais
                                    : []
                                )
                                .map(id => {

                                    const filial =
                                        filiais.find(
                                            item =>
                                                item.id === id
                                        );

                                    return filial
                                        ? filial.nome
                                        : null;
                                })
                                .filter(Boolean)
                                .join(", ");

                            if (!nomesFiliais) {
                                nomesFiliais =
                                    "Nenhuma filial";
                            }
                        }


                        const nomePerfil =
                            PERFIS[usuario.tipo] ||
                            usuario.tipo ||
                            "Usuário";


                        return `

                            <tr>

                                <td>
                                    <strong>
                                        ${escaparHTML(
                                            usuario.nome
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    <span class="badge-perfil">
                                        ${escaparHTML(
                                            nomePerfil
                                        )}
                                    </span>
                                </td>

                                <td>
                                    <span class="badge-filiais">
                                        ${escaparHTML(
                                            nomesFiliais
                                        )}
                                    </span>
                                </td>

                                <td>

                                    <div class="acoes-tabela">

                                        ${
                                            autor
                                                ? ""
                                                : `
                                                    <button
                                                        class="btn btn-primary"
                                                        onclick="editarUsuario('${usuario.id}')"
                                                    >
                                                        Editar
                                                    </button>

                                                    <button
                                                        class="btn btn-secondary"
                                                        onclick="abrirRedefinirSenha('${usuario.id}')"
                                                    >
                                                        Redefinir senha
                                                    </button>

                                                    <button
                                                        class="btn btn-danger"
                                                        onclick="excluirUsuario('${usuario.id}')"
                                                    >
                                                        Excluir
                                                    </button>
                                                `
                                        }

                                    </div>

                                </td>

                            </tr>

                        `;

                    }).join("")}

                </tbody>

            </table>
        `;
    }


    function abrirNovoUsuario() {

        $("#formUsuario")?.reset();

        $("#idUsuario").value = "";

        $("#tituloModalUsuario").textContent =
            "Novo usuário";

        $("#senhaNovoUsuario").required = true;

        montarCheckboxFiliaisUsuario([]);

        mostrarElemento($("#modalUsuario"));
    }


    function montarCheckboxFiliaisUsuario(
        filiaisSelecionadas = []
    ) {

        const container =
            $("#listaFiliaisUsuario");

        if (!container) return;


        if (!filiais.length) {

            container.innerHTML =
                "Nenhuma filial cadastrada.";

            return;
        }


        container.innerHTML = filiais.map(filial => `

            <label class="checkbox-item">

                <input
                    type="checkbox"
                    name="filiaisUsuario"
                    value="${escaparHTML(filial.id)}"
                    ${filiaisSelecionadas.includes(filial.id)
                        ? "checked"
                        : ""}
                >

                <span>
                    ${escaparHTML(filial.nome)}
                </span>

            </label>

        `).join("");
    }


    function editarUsuario(id) {

        const usuario =
            usuarios.find(
                item => item.id === id
            );

        if (!usuario) return;


        if (
            usuario.autor === true ||
            usuario.tipo === "autor"
        ) {

            mostrarToast(
                "O usuário MARCO é o administrador do sistema.",
                "erro"
            );

            return;
        }


        $("#idUsuario").value =
            usuario.id;

        $("#nomeNovoUsuario").value =
            usuario.nome;

        $("#senhaNovoUsuario").value = "";

        $("#senhaNovoUsuario").required = false;

        $("#tipoNovoUsuario").value =
            usuario.tipo || "usuario";


        montarCheckboxFiliaisUsuario(
            Array.isArray(usuario.filiais)
                ? usuario.filiais
                : []
        );


        $("#tituloModalUsuario").textContent =
            "Editar usuário";


        mostrarElemento($("#modalUsuario"));
    }


    function salvarUsuario(eventoForm) {

        eventoForm.preventDefault();


        const id =
            $("#idUsuario").value;

        const nome =
            $("#nomeNovoUsuario").value.trim();

        const senha =
            $("#senhaNovoUsuario").value;

        const tipo =
            $("#tipoNovoUsuario").value;


        const filiaisSelecionadas =
            $$('input[name="filiaisUsuario"]:checked')
                .map(input => input.value);


        if (!nome) {

            mostrarToast(
                "Digite o nome do usuário.",
                "erro"
            );

            return;
        }


        if (!id && !senha) {

            mostrarToast(
                "Digite uma senha para o novo usuário.",
                "erro"
            );

            return;
        }


        if (
            senha &&
            senha.length < 4
        ) {

            mostrarToast(
                "A senha deve ter pelo menos 4 caracteres.",
                "erro"
            );

            return;
        }


        const nomeExiste =
            usuarios.some(
                usuario =>
                    usuario.id !== id &&
                    usuario.nome.toLowerCase() ===
                    nome.toLowerCase()
            );


        if (nomeExiste) {

            mostrarToast(
                "Já existe um usuário com esse nome.",
                "erro"
            );

            return;
        }


        if (!filiaisSelecionadas.length) {

            mostrarToast(
                "Selecione pelo menos uma filial.",
                "erro"
            );

            return;
        }


        if (id) {

            const usuario =
                usuarios.find(
                    item => item.id === id
                );

            if (!usuario) return;


            usuario.nome = nome;
            usuario.tipo = tipo;
            usuario.filiais =
                filiaisSelecionadas;


            if (senha) {
                usuario.senha = senha;
            }


            mostrarToast(
                "Usuário atualizado.",
                "sucesso"
            );

        } else {

            usuarios.push({

                id: gerarId(),

                nome,

                senha,

                tipo,

                autor: false,

                filiais:
                    filiaisSelecionadas,

                criadoEm:
                    new Date().toISOString()
            });


            mostrarToast(
                "Usuário cadastrado.",
                "sucesso"
            );
        }


        salvar(
            CHAVE_USUARIOS,
            usuarios
        );


        fecharModal("#modalUsuario");

        atualizarUsuarios();

        atualizarInformacoesUsuario();
    }


    function excluirUsuario(id) {

        const usuario =
            usuarios.find(
                item => item.id === id
            );

        if (!usuario) return;


        if (
            usuario.autor === true ||
            usuario.tipo === "autor"
        ) {

            mostrarToast(
                "O usuário administrador não pode ser excluído.",
                "erro"
            );

            return;
        }


        if (!confirm(
            `Deseja excluir o usuário "${usuario.nome}"?`
        )) {
            return;
        }


        usuarios =
            usuarios.filter(
                item => item.id !== id
            );


        salvar(
            CHAVE_USUARIOS,
            usuarios
        );


        atualizarUsuarios();


        mostrarToast(
            "Usuário excluído.",
            "sucesso"
        );
    }


    /* =====================================================
       REDEFINIR SENHA
    ===================================================== */

    function abrirRedefinirSenha(id) {

        const usuario =
            usuarios.find(
                item => item.id === id
            );

        if (!usuario) return;


        if (
            usuario.autor === true ||
            usuario.tipo === "autor"
        ) {

            mostrarToast(
                "A senha do administrador não pode ser alterada por este menu.",
                "erro"
            );

            return;
        }


        $("#idUsuarioSenha").value =
            usuario.id;

        $("#novaSenha").value = "";


        mostrarElemento(
            $("#modalSenha")
        );
    }


    function salvarNovaSenha(eventoForm) {

        eventoForm.preventDefault();


        const id =
            $("#idUsuarioSenha").value;

        const novaSenha =
            $("#novaSenha").value;


        if (novaSenha.length < 4) {

            mostrarToast(
                "A senha deve ter pelo menos 4 caracteres.",
                "erro"
            );

            return;
        }


        const usuario =
            usuarios.find(
                item => item.id === id
            );

        if (!usuario) return;


        usuario.senha =
            novaSenha;


        salvar(
            CHAVE_USUARIOS,
            usuarios
        );


        fecharModal("#modalSenha");


        mostrarToast(
            "Senha redefinida com sucesso.",
            "sucesso"
        );
    }


    /* =====================================================
       TEMA
    ===================================================== */

    function aplicarTema(tema) {

        if (tema === "escuro") {

            document.body.classList.add(
                "tema-escuro"
            );

        } else {

            document.body.classList.remove(
                "tema-escuro"
            );
        }


        salvar(
            CHAVE_TEMA,
            tema
        );


        const seletor =
            $("#seletorTema");

        if (seletor) {
            seletor.value = tema;
        }
    }


    function carregarTema() {

        const tema =
            localStorage.getItem(CHAVE_TEMA) ||
            "escuro";

        aplicarTema(
            tema.replace(/"/g, "")
        );
    }


    /* =====================================================
       MODAIS
    ===================================================== */

    function fecharModal(seletor) {

        const modal =
            $(seletor);

        if (modal) {
            modal.classList.add("hidden");
        }
    }


    function fecharTodosModais() {

        $$(".modal").forEach(
            modal =>
                modal.classList.add("hidden")
        );
    }


    /* =====================================================
       ATUALIZAR TODAS AS TELAS
    ===================================================== */

    function atualizarTodasAsTelas() {

        preencherSelectsFiliais();

        atualizarInicio();

        atualizarTabelaIndicadores();

        atualizarIndicadorGeral();

        atualizarDashboard();

        atualizarMetas();

        atualizarAnaliseIA();

        atualizarFiliais();

        atualizarUsuarios();
    }


    /* =====================================================
       EVENTOS - LOGIN
    ===================================================== */

    evento(
        "#formLogin",
        "submit",
        realizarLogin
    );


    /* =====================================================
       EVENTOS - INDICADORES
    ===================================================== */

    evento(
        "#novoIndicadorInicio",
        "click",
        abrirNovoIndicador
    );

    evento(
        "#novoIndicador2",
        "click",
        abrirNovoIndicador
    );

    evento(
        "#formIndicador",
        "submit",
        salvarIndicador
    );

    evento(
        "#cancelarModal",
        "click",
        () => fecharModal("#modalIndicador")
    );

    evento(
        "#fecharModal",
        "click",
        () => fecharModal("#modalIndicador")
    );


    evento(
        "#metaIndicador",
        "input",
        atualizarPreviewStatus
    );

    evento(
        "#resultadoIndicador",
        "input",
        atualizarPreviewStatus
    );

    evento(
        "#filtroCategoria",
        "change",
        atualizarTabelaIndicadores
    );


    /* =====================================================
       EVENTOS - GERAL
    ===================================================== */

    evento(
        "#filtroMesGeral",
        "change",
        atualizarIndicadorGeral
    );

    evento(
        "#filtroFilialGeral",
        "change",
        atualizarIndicadorGeral
    );


    /* =====================================================
       EVENTOS - IA
    ===================================================== */

    evento(
        "#filtroMesIA",
        "change",
        atualizarAnaliseIA
    );

    evento(
        "#filtroFilialIA",
        "change",
        atualizarAnaliseIA
    );

    evento(
        "#atualizarAnaliseIA",
        "click",
        atualizarAnaliseIA
    );


    /* =====================================================
       EVENTOS - INÍCIO
    ===================================================== */

    evento(
        "#seletorFilialAutorInicio",
        "change",
        atualizarInicio
    );


    /* =====================================================
       EVENTOS - METAS
    ===================================================== */

    evento(
        "#novaMeta",
        "click",
        abrirNovaMeta
    );

    evento(
        "#formMeta",
        "submit",
        salvarMeta
    );

    evento(
        "#cancelarModalMeta",
        "click",
        () => fecharModal("#modalMeta")
    );

    evento(
        "#fecharModalMeta",
        "click",
        () => fecharModal("#modalMeta")
    );


    /* =====================================================
       EVENTOS - FILIAIS
    ===================================================== */

    evento(
        "#novaFilial",
        "click",
        abrirNovaFilial
    );

    evento(
        "#formFilial",
        "submit",
        salvarFilial
    );

    evento(
        "#cancelarModalFilial",
        "click",
        () => fecharModal("#modalFilial")
    );

    evento(
        "#fecharModalFilial",
        "click",
        () => fecharModal("#modalFilial")
    );


    /* =====================================================
       EVENTOS - USUÁRIOS
    ===================================================== */

    evento(
        "#novoUsuario",
        "click",
        abrirNovoUsuario
    );

    evento(
        "#formUsuario",
        "submit",
        salvarUsuario
    );

    evento(
        "#cancelarModalUsuario",
        "click",
        () => fecharModal("#modalUsuario")
    );

    evento(
        "#fecharModalUsuario",
        "click",
        () => fecharModal("#modalUsuario")
    );


    /* =====================================================
       EVENTOS - SENHA
    ===================================================== */

    evento(
        "#formSenha",
        "submit",
        salvarNovaSenha
    );

    evento(
        "#cancelarModalSenha",
        "click",
        () => fecharModal("#modalSenha")
    );

    evento(
        "#fecharModalSenha",
        "click",
        () => fecharModal("#modalSenha")
    );


    /* =====================================================
       EVENTOS - DETALHES
    ===================================================== */

    evento(
        "#fecharDetalhes",
        "click",
        () => fecharModal("#modalDetalhes")
    );


    /* =====================================================
       EVENTOS - TEMA
    ===================================================== */

    evento(
        "#seletorTema",
        "change",
        eventoTema => {
            aplicarTema(
                eventoTema.target.value
            );
        }
    );


    /* =====================================================
       EVENTOS - SAIR
    ===================================================== */

    function sairDaConta() {

        if (
            !confirm(
                "Deseja realmente sair da conta?"
            )
        ) {
            return;
        }

        mostrarLogin();
    }


    evento(
        "#botaoSair",
        "click",
        sairDaConta
    );

    evento(
        "#botaoSairSidebar",
        "click",
        sairDaConta
    );


    /* =====================================================
       FECHAR MODAL CLICANDO FORA
    ===================================================== */

    $$(".modal").forEach(modal => {

        modal.addEventListener(
            "click",
            eventoClick => {

                if (
                    eventoClick.target === modal
                ) {
                    modal.classList.add("hidden");
                }

            }
        );

    });


    /* =====================================================
       ESC PARA FECHAR MODAL
    ===================================================== */

    document.addEventListener(
        "keydown",
        eventoTecla => {

            if (eventoTecla.key === "Escape") {

                fecharTodosModais();

                fecharMenuMobile();
            }

        }
    );


    /* =====================================================
       DISPONIBILIZAR FUNÇÕES PARA OS BOTÕES
    ===================================================== */

    window.abrirPagina =
        abrirPagina;

    window.editarIndicador =
        editarIndicador;

    window.excluirIndicador =
        excluirIndicador;

    window.verDetalhesIndicador =
        verDetalhesIndicador;

    window.editarMeta =
        editarMeta;

    window.excluirMeta =
        excluirMeta;

    window.editarFilial =
        editarFilial;

    window.excluirFilial =
        excluirFilial;

    window.editarUsuario =
        editarUsuario;

    window.excluirUsuario =
        excluirUsuario;

    window.abrirRedefinirSenha =
        abrirRedefinirSenha;

    window.atualizarAnaliseIA =
        atualizarAnaliseIA;


    /* =====================================================
       INICIALIZAÇÃO
    ===================================================== */

    carregarTema();

    atualizarFiliaisLogin();

    if (sessao && usuarioLogado()) {

        const usuario =
            usuarioLogado();


        const filialValida =
            ehAutor() ||
            podeAcessarFilial(
                sessao.filialId
            );


        if (filialValida) {

            mostrarAplicacao();

        } else {

            mostrarLogin();
        }

    } else {

        mostrarLogin();
    }


    /* =====================================================
       DATAS PADRÃO
    ===================================================== */

    if ($("#filtroMesGeral")) {

        $("#filtroMesGeral").value =
            mesAtualISO();
    }


    if ($("#filtroMesIA")) {

        $("#filtroMesIA").value =
            mesAtualISO();
    }


    console.log(
        "DULEO - Sistema carregado com sucesso."
    );

});