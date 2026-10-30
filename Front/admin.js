// Panel de administración: login, CRUD de productos y gestión de órdenes. Todo pasa por la API.
const $ = id => document.getElementById(id);
const mx = n => "$" + Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = t => String(t ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

let token = "";
let categorias = [];
let productos = [];
let editandoId = null; // null = producto nuevo

try { token = sessionStorage.getItem("cima-admin-token") || ""; } catch (e) {}

async function api(ruta, opciones = {}) {
  const r = await fetch(ruta, {
    ...opciones,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opciones.headers }
  });
  const datos = r.status === 204 ? null : await r.json().catch(() => ({}));
  if (r.status === 401 && token) { cierraSesion("Tu sesión venció. Entra de nuevo."); throw new Error("Sesión vencida"); }
  if (!r.ok) throw new Error(datos?.error || "No se pudo completar la solicitud");
  return datos;
}

function aviso(id, texto, tipo) {
  const el = $(id);
  el.textContent = texto || "";
  el.className = "mensaje " + (tipo || "");
}

/* ---------- Sesión ---------- */

function muestraPanel(usuario) {
  $("vistaLogin").hidden = true;
  $("vistaPanel").hidden = false;
  $("salir").hidden = false;
  $("sesion").hidden = false;
  $("sesion").textContent = usuario.nombre;
  cargaTodo();
}

function cierraSesion(mensaje) {
  token = "";
  try { sessionStorage.removeItem("cima-admin-token"); sessionStorage.removeItem("cima-admin-usuario"); } catch (e) {}
  $("vistaPanel").hidden = true;
  $("vistaLogin").hidden = false;
  $("salir").hidden = true;
  $("sesion").hidden = true;
  $("loginPassword").value = "";
  aviso("mensajeLogin", mensaje || "", mensaje ? "error" : "");
}

$("formLogin").addEventListener("submit", async e => {
  e.preventDefault();
  aviso("mensajeLogin", "");
  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;
  if (!email || !password) { aviso("mensajeLogin", "Escribe tu correo y tu contraseña.", "error"); return; }
  try {
    const r = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    if (r.usuario.rol !== "admin") throw new Error("Esta cuenta no es de administrador.");
    token = r.token;
    try { sessionStorage.setItem("cima-admin-token", token); sessionStorage.setItem("cima-admin-usuario", JSON.stringify(r.usuario)); } catch (e) {}
    muestraPanel(r.usuario);
  } catch (err) {
    token = "";
    aviso("mensajeLogin", err.message, "error");
  }
});

$("salir").addEventListener("click", () => cierraSesion());

/* ---------- Pestañas ---------- */

document.querySelector(".pestanas").addEventListener("click", e => {
  const b = e.target.closest("[data-vista]"); if (!b) return;
  const vista = b.dataset.vista;
  $("tabProductos").setAttribute("aria-selected", String(vista === "productos"));
  $("tabOrdenes").setAttribute("aria-selected", String(vista === "ordenes"));
  $("vistaProductos").hidden = vista !== "productos";
  $("vistaOrdenes").hidden = vista !== "ordenes";
  aviso("mensajeGlobal", "");
  if (vista === "ordenes") cargaOrdenes();
});

/* ---------- Productos ---------- */

async function cargaTodo() {
  try {
    [categorias, productos] = await Promise.all([api("/api/categorias"), api("/api/productos")]);
    $("pCategoria").innerHTML = categorias.map(c => `<option value="${c.id}">${esc(c.nombre)}</option>`).join("");
    pintaProductos();
  } catch (err) {
    aviso("mensajeGlobal", err.message, "error");
  }
}

function etiquetaStock(stock) {
  if (stock <= 0) return '<span class="etiqueta agotado">Agotado</span>';
  if (stock <= 3) return `<span class="etiqueta poco">${stock} · Poco</span>`;
  return `<span class="etiqueta">${stock}</span>`;
}

function pintaProductos() {
  $("contadorProductos").textContent = `(${productos.length})`;
  $("tablaProductos").innerHTML = productos.length ? productos.map(p => `
    <tr>
      <td>${p.imagenes[0] ? `<img class="miniatura" src="${esc(p.imagenes[0])}" alt="" loading="lazy">` : ""}</td>
      <td class="nombre">${esc(p.nombre)}${p.nuevo ? "<small>Etiqueta NUEVO</small>" : ""}</td>
      <td>${esc(p.categoria)}</td>
      <td class="num">${mx(p.precio)}</td>
      <td class="num">${etiquetaStock(p.stock)}</td>
      <td><div class="acciones-fila">
        <button type="button" data-editar="${p.id}">Editar</button>
        <button type="button" class="peligro" data-eliminar="${p.id}">Eliminar</button>
      </div></td>
    </tr>`).join("") : '<tr><td colspan="6" class="vacio">Aún no hay productos. Crea el primero con "Nuevo producto".</td></tr>';
}

const lineas = texto => texto.split("\n").map(l => l.trim()).filter(Boolean);

function abreFormulario(p) {
  editandoId = p ? p.id : null;
  $("tituloDialogo").textContent = p ? "Editar producto" : "Nuevo producto";
  $("pNombre").value = p?.nombre || "";
  $("pDescripcion").value = p?.descripcion || "";
  $("pPrecio").value = p?.precio ?? "";
  $("pAnterior").value = p?.precio_anterior ?? "";
  $("pStock").value = p?.stock ?? 0;
  $("pCategoria").value = p?.categoria_id ?? categorias[0]?.id ?? "";
  $("pImagenes").value = (p?.imagenes || []).join("\n");
  $("pMedidas").value = (p?.medidas || []).join("\n");
  $("pNuevo").checked = !!p?.nuevo;
  aviso("mensajeProducto", "");
  $("dlgProducto").showModal();
  $("pNombre").focus();
}

$("nuevoProducto").addEventListener("click", () => abreFormulario(null));
$("cancelarProducto").addEventListener("click", () => $("dlgProducto").close());

$("formProducto").addEventListener("submit", async e => {
  e.preventDefault();
  aviso("mensajeProducto", "");
  const cuerpo = {
    nombre: $("pNombre").value.trim(),
    descripcion: $("pDescripcion").value.trim(),
    precio: $("pPrecio").value,
    precio_anterior: $("pAnterior").value === "" ? null : $("pAnterior").value,
    stock: $("pStock").value,
    categoria_id: Number($("pCategoria").value),
    imagenes: lineas($("pImagenes").value),
    medidas: lineas($("pMedidas").value),
    nuevo: $("pNuevo").checked
  };
  if (!cuerpo.nombre) { aviso("mensajeProducto", "El nombre es obligatorio.", "error"); return; }
  if (cuerpo.precio === "" || Number(cuerpo.precio) < 0) { aviso("mensajeProducto", "Escribe un precio válido.", "error"); return; }
  if (cuerpo.stock === "" || !Number.isInteger(Number(cuerpo.stock)) || Number(cuerpo.stock) < 0) { aviso("mensajeProducto", "El stock debe ser un entero de 0 en adelante.", "error"); return; }

  $("guardarProducto").disabled = true;
  try {
    const nuevo = editandoId === null;
    await api(nuevo ? "/api/productos" : `/api/productos/${editandoId}`, { method: nuevo ? "POST" : "PUT", body: JSON.stringify(cuerpo) });
    $("dlgProducto").close();
    aviso("mensajeGlobal", nuevo ? "Producto creado." : "Producto actualizado.", "exito");
    await cargaTodo();
  } catch (err) {
    aviso("mensajeProducto", err.message, "error");
  } finally {
    $("guardarProducto").disabled = false;
  }
});

// El borrado pide una segunda confirmación en el mismo botón
let pendienteBorrar = null;
$("tablaProductos").addEventListener("click", async e => {
  const editar = e.target.closest("[data-editar]");
  if (editar) { abreFormulario(productos.find(p => p.id == editar.dataset.editar)); return; }

  const borrar = e.target.closest("[data-eliminar]");
  if (!borrar) return;
  if (pendienteBorrar !== borrar.dataset.eliminar) {
    pendienteBorrar = borrar.dataset.eliminar;
    document.querySelectorAll(".peligro.confirmar").forEach(b => { b.classList.remove("confirmar"); b.textContent = "Eliminar"; });
    borrar.classList.add("confirmar");
    borrar.textContent = "¿Seguro? Pulsa otra vez";
    setTimeout(() => { if (pendienteBorrar === borrar.dataset.eliminar) { pendienteBorrar = null; borrar.classList.remove("confirmar"); borrar.textContent = "Eliminar"; } }, 4000);
    return;
  }
  pendienteBorrar = null;
  try {
    await api(`/api/productos/${borrar.dataset.eliminar}`, { method: "DELETE" });
    aviso("mensajeGlobal", "Producto eliminado.", "exito");
    await cargaTodo();
  } catch (err) {
    aviso("mensajeGlobal", err.message, "error");
    pintaProductos();
  }
});

/* ---------- Órdenes ---------- */

const ESTADOS = ["pagada", "enviada", "cancelada"];

async function cargaOrdenes() {
  try {
    const ordenes = await api("/api/ordenes");
    $("contadorOrdenes").textContent = `(${ordenes.length})`;
    $("tablaOrdenes").innerHTML = ordenes.length ? ordenes.map(o => `
      <tr>
        <td>${o.id}</td>
        <td>${new Date(o.creado_en).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}</td>
        <td class="nombre">${esc(o.nombre_cliente)}<small>${esc(o.email_cliente)}</small></td>
        <td><ul class="items-orden">${o.items.map(i => `<li>${i.cantidad} × ${esc(i.nombre)}</li>`).join("")}</ul></td>
        <td class="num">${mx(o.total)}</td>
        <td>${o.estado === "cancelada"
          ? '<span class="etiqueta agotado">cancelada</span>'
          : `<select data-orden="${o.id}" aria-label="Estado de la orden ${o.id}">${ESTADOS.map(s => `<option value="${s}" ${s === o.estado ? "selected" : ""}>${s}</option>`).join("")}</select>`}</td>
      </tr>`).join("") : '<tr><td colspan="6" class="vacio">Todavía no hay órdenes.</td></tr>';
  } catch (err) {
    aviso("mensajeGlobal", err.message, "error");
  }
}

$("tablaOrdenes").addEventListener("change", async e => {
  const sel = e.target.closest("[data-orden]"); if (!sel) return;
  try {
    await api(`/api/ordenes/${sel.dataset.orden}/estado`, { method: "PATCH", body: JSON.stringify({ estado: sel.value }) });
    aviso("mensajeGlobal", sel.value === "cancelada" ? "Orden cancelada. El stock regresó al inventario." : "Estado actualizado.", "exito");
    await cargaOrdenes();
    if (sel.value === "cancelada") cargaTodo();
  } catch (err) {
    aviso("mensajeGlobal", err.message, "error");
    cargaOrdenes();
  }
});

/* ---------- Arranque ---------- */

let usuarioGuardado = null;
try { usuarioGuardado = JSON.parse(sessionStorage.getItem("cima-admin-usuario")); } catch (e) {}
if (token && usuarioGuardado) muestraPanel(usuarioGuardado);
