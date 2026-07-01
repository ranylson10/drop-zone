import { NextRequest, NextResponse } from "next/server"

const BASE_URL = "https://developers.freefirecommunity.com/api/v1"

type Region = "br" | "sg" | "ind"

function json(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  })
}

async function chamarFreeFireApi(path: string, params: Record<string, string>) {
  const apiKey = process.env.FREEFIRE_API_KEY

  if (!apiKey) {
    throw new Error("FREEFIRE_API_KEY não configurada no ambiente.")
  }

  const url = new URL(`${BASE_URL}${path}`)
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
      accept: "application/json",
    },
    cache: "no-store",
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message = data?.message || data?.error || `Erro na API Free Fire: ${response.status}`
    throw new Error(message)
  }

  return data
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const uid = String(searchParams.get("uid") || "").replace(/\D/g, "")
  const region = String(searchParams.get("region") || "br") as Region

  if (!uid || uid.length < 6) {
    return json({ ok: false, error: "UID inválido." }, 400)
  }

  if (!["br", "sg", "ind"].includes(region)) {
    return json({ ok: false, error: "Região inválida." }, 400)
  }

  try {
    const [infoResponse, banResponse] = await Promise.allSettled([
      chamarFreeFireApi("/info", { region, uid }),
      chamarFreeFireApi("/bancheck", { uid, lang: "pt" }),
    ])

    if (infoResponse.status === "rejected") {
      return json(
        { ok: false, error: infoResponse.reason?.message || "Jogador não encontrado." },
        404,
      )
    }

    const player = infoResponse.value?.data || infoResponse.value
    const ban =
      banResponse.status === "fulfilled"
        ? banResponse.value?.data || banResponse.value
        : { isBanned: false, message: "Não foi possível checar banimento agora." }

    return json({ ok: true, player, ban })
  } catch (error: any) {
    return json({ ok: false, error: error?.message || "Erro inesperado na consulta." }, 500)
  }
}
