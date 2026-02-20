export interface DadosProposta {
  proposta: any;
  cliente: any;
  servicos: any[];
  empresa: any;
}

// Função para converter número em texto por extenso (simplificada)
function valorPorExtenso(valor: number): string {
  if (isNaN(valor) || valor === 0) return "zero reais";

  try {
    // Esta é uma implementação simplificada
    const unidades = [
      "",
      "um",
      "dois",
      "três",
      "quatro",
      "cinco",
      "seis",
      "sete",
      "oito",
      "nove",
    ];
    const dezenas = [
      "",
      "dez",
      "vinte",
      "trinta",
      "quarenta",
      "cinquenta",
      "sessenta",
      "setenta",
      "oitenta",
      "noventa",
    ];
    const centenas = [
      "",
      "cento",
      "duzentos",
      "trezentos",
      "quatrocentos",
      "quinhentos",
      "seiscentos",
      "setecentos",
      "oitocentos",
      "novecentos",
    ];
    const especiais = [
      "dez",
      "onze",
      "doze",
      "treze",
      "quatorze",
      "quinze",
      "dezesseis",
      "dezessete",
      "dezoito",
      "dezenove",
    ];

    // Arredonda para duas casas decimais e separa reais e centavos
    const valorFormatado = Math.round(valor * 100) / 100;
    const reais = Math.floor(valorFormatado);
    const centavos = Math.round((valorFormatado - reais) * 100);

    // Implementação simplificada para valores até 999
    let extenso = "";

    if (reais > 0) {
      if (reais < 10) {
        extenso = unidades[reais];
      } else if (reais < 20) {
        extenso = especiais[reais - 10];
      } else if (reais < 100) {
        const dezena = Math.floor(reais / 10);
        const unidade = reais % 10;
        extenso =
          dezenas[dezena] + (unidade > 0 ? " e " + unidades[unidade] : "");
      } else if (reais < 1000) {
        const centena = Math.floor(reais / 100);
        const resto = reais % 100;

        extenso = centenas[centena];

        if (resto > 0) {
          if (resto < 10) {
            extenso += " e " + unidades[resto];
          } else if (resto < 20) {
            extenso += " e " + especiais[resto - 10];
          } else {
            const dezena = Math.floor(resto / 10);
            const unidade = resto % 10;
            extenso +=
              " e " +
              dezenas[dezena] +
              (unidade > 0 ? " e " + unidades[unidade] : "");
          }
        }
      } else {
        extenso = "mais de mil";
      }

      extenso += " " + (reais === 1 ? "real" : "reais");
    }

    if (centavos > 0) {
      if (extenso !== "") extenso += " e ";

      if (centavos < 10) {
        extenso += unidades[centavos];
      } else if (centavos < 20) {
        extenso += especiais[centavos - 10];
      } else {
        const dezena = Math.floor(centavos / 10);
        const unidade = centavos % 10;
        extenso +=
          dezenas[dezena] + (unidade > 0 ? " e " + unidades[unidade] : "");
      }

      extenso += " " + (centavos === 1 ? "centavo" : "centavos");
    }

    return extenso;
  } catch (error) {
    console.error("Erro ao converter valor por extenso:", error);
    return `${valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })}`;
  }
}

export function processarVariaveis(
  template: string,
  dados: DadosProposta
): string {
  // Verificar se o template é uma string válida
  if (typeof template !== "string") {
    //console.error("Template inválido:", template);
    return "[Erro: Template inválido]";
  }

  let resultado = template;

  // Dados do cliente
  resultado = resultado.replace(
    /{{cliente_nome}}/g,
    dados.cliente?.nome || "[Nome do Cliente]"
  );
  resultado = resultado.replace(
    /{{cliente_empresa}}/g,
    dados.cliente?.empresa || "[Empresa do Cliente]"
  );
  resultado = resultado.replace(
    /{{cliente_email}}/g,
    dados.cliente?.email || "[Email do Cliente]"
  );
  resultado = resultado.replace(
    /{{cliente_telefone}}/g,
    dados.cliente?.telefone || "[Telefone do Cliente]"
  );
  resultado = resultado.replace(
    /{{cliente_endereco}}/g,
    dados.cliente?.endereco || "[Endereço do Cliente]"
  );
  resultado = resultado.replace(
    /{{cliente_cidade}}/g,
    dados.cliente?.cidade || "[Cidade do Cliente]"
  );
  resultado = resultado.replace(
    /{{cliente_estado}}/g,
    dados.cliente?.estado || "[Estado do Cliente]"
  );
  resultado = resultado.replace(
    /{{cliente_cnpj}}/g,
    dados.cliente?.cnpj || "[CNPJ do Cliente]"
  );
  resultado = resultado.replace(
    /{{cliente_cpf}}/g,
    dados.cliente?.cpf || "[CPF do Cliente]"
  );

  // Dados da proposta
  resultado = resultado.replace(
    /{{proposta_numero}}/g,
    dados.proposta?.numero || "[Número da Proposta]"
  );
  resultado = resultado.replace(
    /{{proposta_titulo}}/g,
    dados.proposta?.titulo || "[Título da Proposta]"
  );
  resultado = resultado.replace(
    /{{proposta_data}}/g,
    dados.proposta?.created_at
      ? new Date(dados.proposta.created_at).toLocaleDateString("pt-BR")
      : "[Data da Proposta]"
  );
  resultado = resultado.replace(
    /{{proposta_validade}}/g,
    dados.proposta?.data_vencimento
      ? new Date(dados.proposta.data_vencimento).toLocaleDateString("pt-BR")
      : "[Data de Validade]"
  );
  resultado = resultado.replace(
    /{{proposta_status}}/g,
    dados.proposta?.status || "[Status da Proposta]"
  );

  // Valores financeiros
  const subtotal = dados.proposta?.subtotal || 0;
  const percentualDesconto = dados.proposta?.desconto || 0;
  const percentualAcrescimo = dados.proposta?.acrescimo || 0;
  const valorDesconto = (subtotal * percentualDesconto) / 100;
  const valorAcrescimo = (subtotal * percentualAcrescimo) / 100;
  const valorTotal =
    dados.proposta?.valor_total || subtotal - valorDesconto + valorAcrescimo;

  resultado = resultado.replace(
    /{{valor_subtotal}}/g,
    `R$ ${subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
  );
  resultado = resultado.replace(
    /{{valor_desconto}}/g,
    `R$ ${valorDesconto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
  );
  resultado = resultado.replace(
    /{{valor_desconto_percentual}}/g,
    `${percentualDesconto.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
    })}%`
  );
  resultado = resultado.replace(
    /{{valor_acrescimo}}/g,
    `R$ ${valorAcrescimo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
  );
  resultado = resultado.replace(
    /{{valor_acrescimo_percentual}}/g,
    `${percentualAcrescimo.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
    })}%`
  );
  resultado = resultado.replace(
    /{{valor_total}}/g,
    `R$ ${valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
  );
  resultado = resultado.replace(
    /{{valor_total_extenso}}/g,
    valorPorExtenso(valorTotal)
  );

  // Lista de serviços
  const listaServicos = (dados.servicos || [])
    .map(
      (s) =>
        `• ${s.nome} (${s.quantidade}x) - R$ ${(
          (s.valor_personalizado || s.valor_base) * s.quantidade
        ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
    )
    .join("\n");
  resultado = resultado.replace(/{{servicos_lista}}/g, listaServicos);

  // Tabela de serviços (HTML)
  const tabelaServicos = `
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <thead>
        <tr style="background-color: #f5f5f5;">
          <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Serviço</th>
          <th style="border: 1px solid #ddd; padding: 12px; text-align: center;">Qtd</th>
          <th style="border: 1px solid #ddd; padding: 12px; text-align: right;">Valor Unit.</th>
          <th style="border: 1px solid #ddd; padding: 12px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${(dados.servicos || [])
          .map(
            (s) => `
          <tr>
            <td style="border: 1px solid #ddd; padding: 12px;">${s.nome}</td>
            <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">${
              s.quantidade
            }</td>
            <td style="border: 1px solid #ddd; padding: 12px; text-align: right;">R$ ${(
              s.valor_personalizado || s.valor_base
            ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
            <td style="border: 1px solid #ddd; padding: 12px; text-align: right;">R$ ${(
              (s.valor_personalizado || s.valor_base) * s.quantidade
            ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;
  resultado = resultado.replace(/{{servicos_tabela}}/g, tabelaServicos);

  resultado = resultado.replace(
    /{{servicos_total}}/g,
    (dados.servicos || []).length.toString()
  );

  // Outros
  resultado = resultado.replace(
    /{{observacoes}}/g,
    dados.proposta?.observacoes || "[Sem observações]"
  );
  resultado = resultado.replace(
    /{{data_atual}}/g,
    new Date().toLocaleDateString("pt-BR")
  );
  resultado = resultado.replace(
    /{{condicoes_pagamento}}/g,
    dados.proposta?.condicoes_pagamento || "[Condições de Pagamento]"
  );
  resultado = resultado.replace(
    /{{prazo_entrega}}/g,
    dados.proposta?.prazo_entrega || "[Prazo de Entrega]"
  );

  return resultado;
}
