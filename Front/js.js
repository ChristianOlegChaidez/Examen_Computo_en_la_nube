// El catálogo, el stock y las compras vienen de la API (Backend). El carrito vive en el navegador.
let productos = [];
let categorias = [];
let cat = "";
let carrito = {}; // { id_producto: cantidad }

const mx = n => "$" + n.toLocaleString("es-MX");
const $ = id => document.getElementById(id);
const esc = t => String(t).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
const porId = id => productos.find(p => p.id == id);

try { cat = localStorage.getItem("cima-cat") || ""; } catch (e) {}
try { carrito = JSON.parse(localStorage.getItem("cima-carrito")) || {}; } catch (e) {}

async function api(ruta, opciones) {
  const r = await fetch(ruta, opciones);
  const datos = r.status === 204 ? null : await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(datos?.error || "No se pudo completar la solicitud");
  return datos;
}

function guardaCarrito() {
  try { localStorage.setItem("cima-carrito", JSON.stringify(carrito)); } catch (e) {}
}

async function cargaCatalogo() {
  try {
    [productos, categorias] = await Promise.all([api("/api/productos"), api("/api/categorias")]);
  } catch (err) {
    $("grid").innerHTML = `<p class="mensaje error">No se pudo cargar el catálogo. ${esc(err.message)}</p>`;
    return;
  }
  // Quita del carrito lo que ya no existe o ya no tiene stock suficiente
  for (const id of Object.keys(carrito)) {
    const p = porId(id);
    if (!p || p.stock <= 0) delete carrito[id];
    else carrito[id] = Math.min(carrito[id], p.stock);
  }
  guardaCarrito();
  if (!categorias.some(c => c.nombre === cat)) cat = categorias[0]?.nombre || "";
  const foto = productos[0]?.imagenes[1] || productos[0]?.imagenes[0];
  $("heroArt").innerHTML = foto ? `<img src="${foto}" alt="${productos[0].nombre}">` : "";
  pintaTabs(); pintaGrid(); pintaCarrito();
}

function pintaTabs() {
  $("tabs").innerHTML = categorias.map(c => `<button type="button" data-cat="${esc(c.nombre)}" aria-pressed="${c.nombre === cat}">${esc(c.nombre)}</button>`).join("");
}

function pintaGrid() {
  $("tituloCat").textContent = cat;
  $("grid").innerHTML = productos.filter(p => p.categoria === cat).map(p => `
    <article class="card" tabindex="0" data-id="${p.id}">
      ${p.nuevo ? '<span class="nuevo">NUEVO</span>' : ""}
      ${p.stock <= 0 ? '<span class="agotado">AGOTADO</span>' : ""}
      <h3>${esc(p.nombre)}</h3>
      <div class="precio">${mx(p.precio)}${p.precio_anterior ? `<s>${mx(p.precio_anterior)}</s>` : ""}</div>
      <div class="img"><img class="foto" src="${esc(p.imagenes[0] || "")}" alt="${esc(p.nombre)}" loading="lazy"></div>
      <div class="miniaturas">${p.imagenes.slice(0, 3).map((src, n) => `<button type="button" class="mini" aria-label="Ver foto ${n + 1} de ${esc(p.nombre)}" aria-pressed="${n === 0}"><img src="${esc(src)}" alt="" loading="lazy"></button>`).join("")}</div>
      <div class="detalle">
        <h4>${esc(p.nombre)}</h4>
        <p>${esc(p.descripcion)}</p>
        <div class="medidas">${p.medidas.map(m => `<span>${esc(m)}</span>`).join("")}<span>${p.stock > 0 ? `${p.stock} disponibles` : "Sin stock"}</span></div>
        <button type="button" class="agregar" data-add="${p.id}" ${p.stock <= 0 ? "disabled" : ""}>${p.stock <= 0 ? "Agotado" : "Agregar al carrito"}</button>
      </div>
    </article>`).join("");
}

function pintaCarrito() {
  const ids = Object.keys(carrito);
  const n = ids.reduce((s, i) => s + carrito[i], 0);
  // El total aquí es solo informativo: el servidor lo recalcula con los precios de la base de datos
  const total = ids.reduce((s, i) => s + carrito[i] * porId(i).precio, 0);
  $("cuenta").textContent = n;
  $("total").textContent = mx(total);
  $("pagar").disabled = !ids.length;
  $("lineas").innerHTML = ids.length ? ids.map(i => {
    const p = porId(i);
    return `<div class="linea"><strong>${esc(p.nombre)}</strong><span class="precio">${mx(p.precio * carrito[i])}</span><div class="cantidad" role="group" aria-label="Cantidad de ${esc(p.nombre)}"><button type="button" data-menos="${i}" aria-label="Quitar una unidad">−</button><output>${carrito[i]}</output><button type="button" data-mas="${i}" aria-label="Agregar una unidad" ${carrito[i] >= p.stock ? "disabled" : ""}>+</button></div><button type="button" class="quitar" data-quita="${i}">Quitar</button></div>`;
  }).join("") : '<p class="vacio">Tu carrito está vacío. Agrega un mueble desde el catálogo.</p>';
}

function panel(abre) {
  $("panel").classList.toggle("abierto", abre);
  $("velo").classList.toggle("abierto", abre);
  $("panel").setAttribute("aria-hidden", String(!abre));
}

function muestraFoto(mini) {
  const card = mini.closest(".card");
  card.querySelector(".foto").src = mini.querySelector("img").src;
  card.querySelectorAll(".mini").forEach(m => m.setAttribute("aria-pressed", String(m === mini)));
}

function mensajePago(texto, tipo) {
  $("mensajePago").textContent = texto;
  $("mensajePago").className = "mensaje " + (tipo || "");
}

$("tabs").addEventListener("click", e => {
  const b = e.target.closest("[data-cat]"); if (!b) return;
  cat = b.dataset.cat;
  try { localStorage.setItem("cima-cat", cat); } catch (e) {}
  pintaTabs(); pintaGrid();
});

$("grid").addEventListener("mouseover", e => {
  const m = e.target.closest(".mini"); if (m) muestraFoto(m);
});

$("grid").addEventListener("click", e => {
  const mini = e.target.closest(".mini");
  if (mini) { muestraFoto(mini); return; }
  const add = e.target.closest("[data-add]");
  if (add) {
    const p = porId(add.dataset.add);
    if ((carrito[p.id] || 0) >= p.stock) {
      add.textContent = `Máximo: ${p.stock}`;
    } else {
      carrito[p.id] = (carrito[p.id] || 0) + 1;
      guardaCarrito(); pintaCarrito();
      add.textContent = "Agregado ✓"; add.classList.add("ok");
    }
    setTimeout(() => { add.textContent = "Agregar al carrito"; add.classList.remove("ok"); }, 1200);
    return;
  }
  const card = e.target.closest(".card"); // en pantallas táctiles, un toque abre la descripción
  if (card) { const abierta = card.classList.contains("abierta"); document.querySelectorAll(".card.abierta").forEach(c => c.classList.remove("abierta")); if (!abierta) card.classList.add("abierta"); }
});

$("lineas").addEventListener("click", e => {
  const b = e.target.closest("[data-mas], [data-menos], [data-quita]"); if (!b) return;
  if (b.dataset.mas) { const p = porId(b.dataset.mas); if (carrito[p.id] < p.stock) carrito[p.id]++; }
  else if (b.dataset.menos) { const i = b.dataset.menos; if (--carrito[i] <= 0) delete carrito[i]; }
  else delete carrito[b.dataset.quita];
  guardaCarrito(); pintaCarrito();
});

$("formPago").addEventListener("submit", async e => {
  e.preventDefault();
  mensajePago("");
  const nombre = $("pagoNombre").value.trim();
  const email = $("pagoEmail").value.trim();
  if (!nombre || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    mensajePago("Escribe tu nombre y un correo válido.", "error");
    return;
  }
  $("pagar").disabled = true;
  try {
    const orden = await api("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, email, items: Object.entries(carrito).map(([producto_id, cantidad]) => ({ producto_id: Number(producto_id), cantidad })) })
    });
    carrito = {}; guardaCarrito();
    mensajePago(`Compra realizada. Orden #${orden.orden_id} por ${mx(orden.total)}.`, "exito");
    await cargaCatalogo(); // refleja el stock nuevo
  } catch (err) {
    mensajePago(err.message, "error");
    await cargaCatalogo(); // por si el stock cambió
  }
  pintaCarrito();
});

$("abrirCarrito").onclick = () => panel(true);
$("cerrarCarrito").onclick = () => panel(false);
$("velo").onclick = () => panel(false);
document.addEventListener("keydown", e => { if (e.key === "Escape") panel(false); });

cargaCatalogo();
