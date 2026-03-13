import Layout from "../components/Layout";
import StatusBadge from "../components/StatusBadge";
import { MOCK_APPLICATIONS } from "../mocks/application";

export default function ApplicationsPage() {
  return (
    <Layout>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">My Applications</h1>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Project</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Sector</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">District</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {MOCK_APPLICATIONS.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-800">{app.projectName}</td>
                  <td className="px-6 py-4 text-gray-500">{app.sector}</td>
                  <td className="px-6 py-4 text-gray-500">{app.district}</td>
                  <td className="px-6 py-4"><StatusBadge status={app.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
