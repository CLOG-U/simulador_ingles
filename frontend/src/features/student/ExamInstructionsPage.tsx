import { Link } from "react-router-dom";
import { AppShell } from "../../components/AppShell";

export function ExamInstructionsPage() {
  return (
    <AppShell title="Instrucciones">
      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Cómo funciona la prueba</h2>
        <p>Verás un dato del verbo y completarás los otros dos campos.</p>
        <ul className="list-disc space-y-2 pl-5 text-sm text-gray-700">
          <li>
            <strong>Desde español:</strong> te damos el significado → escribes forma base y pasado.
          </li>
          <li>
            <strong>Desde forma base:</strong> te damos el verbo en presente → escribes español y
            pasado.
          </li>
          <li>
            <strong>Desde pasado:</strong> te damos el pasado → escribes forma base y español.
          </li>
        </ul>
        <p className="text-sm text-gray-600">
          Ejemplo pasado: <em>went</em> → <em>go</em> + <em>ir</em>
        </p>
        <Link to="/student/exam/start" className="btn-primary inline-flex">
          Comenzar evaluación
        </Link>
      </section>
    </AppShell>
  );
}
