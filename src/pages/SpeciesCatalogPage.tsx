import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listProjects } from "../api/projects";
import { buscarEspeciesCatalogo, completarEspecie, renombrarEspecie } from "../api/species";
import { ApiError } from "../api/client";
import type { Project } from "../types/project";
import type { EspecieCatalogo } from "../types/species";
import { Icon } from "../components/Icons";
import { PendingNotice } from "../components/PendingNotice";

/**
 * Catálogo de especies del Inspector (CC-053 puntos 4 y 5): buscar una
 * especie, completar su género y familia, y corregir su nombre científico.
 * El catálogo es global; el proyecto elegido solo sirve para que el backend
 * confirme el acceso y el rol (la ruta de la API cuelga de un proyecto).
 * Origen, persistencia del follaje y tipo de hoja se muestran como código y
 * no se editan: la API no entrega su catálogo con etiquetas (B20, PR-021).
 */
export default function SpeciesCatalogPage() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState("");

  const [texto, setTexto] = useState("");
  const [resultado, setResultado] = useState<{ q: string; data: EspecieCatalogo[] } | null>(null);
  const [errorBusqueda, setErrorBusqueda] = useState<{ q: string; message: string } | null>(null);
  const [seleccion, setSeleccion] = useState<EspecieCatalogo | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listProjects()
      .then((data) => {
        if (cancelled) return;
        setProjects(data);
        if (data.length > 0) setProjectId((actual) => actual || data[0].id);
      })
      .catch((err: unknown) => {
        if (!cancelled) setProjectsError(mensajeError(err, "No se pudieron cargar tus proyectos.", false));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const q = texto.trim();
  const clave = `${projectId}|${q}`;

  // Búsqueda con una pausa corta mientras se escribe; el estado de carga se deduce.
  useEffect(() => {
    if (!projectId || !q) return;
    let cancelled = false;
    const t = setTimeout(() => {
      buscarEspeciesCatalogo(projectId, q)
        .then((data) => {
          if (!cancelled) setResultado({ q: clave, data });
        })
        .catch((err: unknown) => {
          if (!cancelled) setErrorBusqueda({ q: clave, message: mensajeError(err, "No se pudo buscar en el catálogo.", false) });
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [projectId, q, clave]);

  const lista = resultado?.q === clave ? resultado.data : null;
  const error = errorBusqueda?.q === clave ? errorBusqueda.message : null;
  const buscando = !!q && !!projectId && !lista && !error;

  function actualizada(e: EspecieCatalogo, mensaje: string) {
    setSeleccion(e);
    setAviso(mensaje);
    setResultado((r) => r && { ...r, data: r.data.map((x) => (x.id === e.id ? e : x)) });
  }

  return (
    <div className="sivu-species">
      <Link to="/inspector/mis-ot" className="sivu-insp__back">
        <Icon name="arrow-left" size={14} /> Mis OT
      </Link>
      <header className="page-header">
        <div>
          <h1>Catálogo de especies</h1>
          <p className="page-header__sub">Compartido por todos los proyectos. Busca una especie para completar su ficha o corregir su nombre.</p>
        </div>
      </header>

      {projectsError && (
        <p className="sivu-state sivu-state--error" role="alert">
          <Icon name="alert" size={13} /> {projectsError}
        </p>
      )}
      {!projects && !projectsError && <p className="sivu-state">Cargando tus proyectos…</p>}
      {projects && projects.length === 0 && (
        <p className="sivu-state">No eres miembro de ningún proyecto, así que no puedes consultar el catálogo.</p>
      )}

      {projects && projects.length > 0 && (
        <section className="card card--pad sivu-species__search">
          {projects.length > 1 && (
            <div className="sivu-species__field">
              <label htmlFor="especies-proyecto">Proyecto</label>
              <select id="especies-proyecto" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre_proyecto}
                  </option>
                ))}
              </select>
              <small>El catálogo es el mismo en todos; el proyecto solo confirma tu permiso.</small>
            </div>
          )}
          <div className="sivu-species__field">
            <label htmlFor="especies-buscar">Nombre científico</label>
            <input
              id="especies-buscar"
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Por ejemplo, Acer"
              autoComplete="off"
            />
          </div>

          {!q && <p className="sivu-state">Escribe parte del nombre para buscar.</p>}
          {buscando && <p className="sivu-state">Buscando…</p>}
          {error && (
            <p className="sivu-state sivu-state--error" role="alert">
              <Icon name="alert" size={13} /> {error}
            </p>
          )}
          {lista && lista.length === 0 && (
            <p className="sivu-state">
              No hay especies con «{q}». Una especie nueva se incorpora al finalizar una inspección que la registre.
            </p>
          )}
          {lista && lista.length > 0 && (
            <ul className="sivu-species__list" aria-label="Especies encontradas">
              {lista.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    className={seleccion?.id === e.id ? "is-on" : ""}
                    aria-pressed={seleccion?.id === e.id}
                    onClick={() => {
                      setSeleccion(e);
                      setAviso(null);
                    }}
                  >
                    <em>{e.especie_cientifica}</em>
                    <small>{[e.genero, e.familia].filter(Boolean).join(" · ") || "Ficha sin completar"}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {lista && lista.length === 20 && <small>Se muestran las primeras 20. Escribe más del nombre para acotar.</small>}
        </section>
      )}

      {aviso && (
        <p className="sivu-state sivu-state--ok" role="status">
          {aviso}
        </p>
      )}
      {seleccion && projectId && (
        <SpeciesSheet key={seleccion.id + seleccion.updated_at} especie={seleccion} projectId={projectId} onSaved={actualizada} />
      )}
    </div>
  );
}

function SpeciesSheet({
  especie,
  projectId,
  onSaved,
}: {
  especie: EspecieCatalogo;
  projectId: string;
  onSaved: (e: EspecieCatalogo, mensaje: string) => void;
}) {
  const [genero, setGenero] = useState(especie.genero ?? "");
  const [familia, setFamilia] = useState(especie.familia ?? "");
  const [guardando, setGuardando] = useState(false);
  const [errorFicha, setErrorFicha] = useState<string | null>(null);

  const [nombre, setNombre] = useState(especie.especie_cientifica);
  const [confirmando, setConfirmando] = useState(false);
  const [renombrando, setRenombrando] = useState(false);
  const [errorNombre, setErrorNombre] = useState<string | null>(null);

  const cambioGenero = genero.trim() !== (especie.genero ?? "");
  const cambioFamilia = familia.trim() !== (especie.familia ?? "");
  const nombreNuevo = nombre.trim();
  const cambioNombre = !!nombreNuevo && nombreNuevo !== especie.especie_cientifica;

  async function guardarFicha(e: React.FormEvent) {
    e.preventDefault();
    if (!cambioGenero && !cambioFamilia) return;
    setGuardando(true);
    setErrorFicha(null);
    try {
      // Solo lo que cambió; un campo vaciado queda sin dato (null), nunca en blanco.
      const body: { genero?: string | null; familia?: string | null } = {};
      if (cambioGenero) body.genero = genero.trim() || null;
      if (cambioFamilia) body.familia = familia.trim() || null;
      const nueva = await completarEspecie(projectId, especie.id, body);
      onSaved(nueva, "Ficha guardada.");
    } catch (err) {
      setErrorFicha(mensajeError(err, "No se pudo guardar la ficha."));
      setGuardando(false);
    }
  }

  async function corregirNombre() {
    setRenombrando(true);
    setErrorNombre(null);
    try {
      const r = await renombrarEspecie(projectId, especie.id, nombreNuevo);
      onSaved(
        { ...especie, especie_cientifica: r.especie_cientifica, updated_at: new Date().toISOString() },
        `Nombre corregido: antes «${r.nombre_anterior}».`
      );
    } catch (err) {
      setErrorNombre(
        err instanceof ApiError && err.status === 409
          ? "Ya existe una especie con ese nombre en el catálogo."
          : err instanceof ApiError && err.status === 400
            ? "Ese nombre no es válido: el catálogo no admite «Género sp.» ni «No determinado» (D-13)."
            : mensajeError(err, "No se pudo corregir el nombre.")
      );
      setRenombrando(false);
      setConfirmando(false);
    }
  }

  const codigo = (v: string | null) => v ?? "Sin dato";

  return (
    <section className="card card--pad sivu-species__sheet" aria-labelledby="ficha-especie">
      <h2 id="ficha-especie">
        <em>{especie.especie_cientifica}</em>
      </h2>

      <dl className="sivu-species__dl">
        <div>
          <dt>origen_biogeografico</dt>
          <dd>{codigo(especie.origen_biogeografico)}</dd>
        </div>
        <div>
          <dt>persistencia_follaje</dt>
          <dd>{codigo(especie.persistencia_follaje)}</dd>
        </div>
        <div>
          <dt>tipo_hoja</dt>
          <dd>{codigo(especie.tipo_hoja)}</dd>
        </div>
      </dl>
      <PendingNotice
        compact
        what="las opciones de origen, persistencia del follaje y tipo de hoja; por eso se muestran sus códigos y no se editan aquí"
        refs="B20 · catálogos de CATALOGO_ESPECIES"
      />

      <form className="sivu-species__form" onSubmit={guardarFicha}>
        <h3>Completar ficha</h3>
        <div className="sivu-species__row">
          <div className="sivu-species__field">
            <label htmlFor="especie-genero">Género</label>
            <input id="especie-genero" value={genero} onChange={(e) => setGenero(e.target.value)} disabled={guardando} />
          </div>
          <div className="sivu-species__field">
            <label htmlFor="especie-familia">Familia</label>
            <input id="especie-familia" value={familia} onChange={(e) => setFamilia(e.target.value)} disabled={guardando} />
          </div>
        </div>
        {errorFicha && (
          <p className="sivu-state sivu-state--error" role="alert">
            <Icon name="alert" size={13} /> {errorFicha}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-sm" disabled={guardando || (!cambioGenero && !cambioFamilia)}>
          {guardando ? "Guardando…" : "Guardar ficha"}
        </button>
      </form>

      <div className="sivu-species__form">
        <h3>Corregir nombre científico</h3>
        <div className="sivu-species__field">
          <label htmlFor="especie-nombre">Nombre científico</label>
          <input
            id="especie-nombre"
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              setConfirmando(false);
            }}
            disabled={renombrando}
          />
          <small>Cambia el nombre en los árboles de todos los proyectos que usan esta especie. El nombre anterior queda en el historial.</small>
        </div>
        {errorNombre && (
          <p className="sivu-state sivu-state--error" role="alert">
            <Icon name="alert" size={13} /> {errorNombre}
          </p>
        )}
        {!confirmando ? (
          <button type="button" className="btn btn-secondary btn-sm" disabled={!cambioNombre || renombrando} onClick={() => setConfirmando(true)}>
            Corregir nombre
          </button>
        ) : (
          <div className="sivu-species__confirm" role="alertdialog" aria-label="Confirmar corrección">
            <p>
              ¿Cambiar <em>{especie.especie_cientifica}</em> por <em>{nombreNuevo}</em> en todos los proyectos?
            </p>
            <div>
              <button type="button" className="btn btn-primary btn-sm" onClick={corregirNombre} disabled={renombrando}>
                {renombrando ? "Corrigiendo…" : "Sí, corregir"}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmando(false)} disabled={renombrando}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/** `soloInspector`: el 403 de completar/corregir es por rol; el de buscar, por falta de acceso al proyecto. */
function mensajeError(err: unknown, porDefecto: string, soloInspector = true): string {
  if (err instanceof ApiError && err.status === 403) {
    return soloInspector ? "Solo el Inspector del proyecto puede hacer esto." : "No tienes acceso a este proyecto.";
  }
  return err instanceof Error && err.message ? err.message : porDefecto;
}
