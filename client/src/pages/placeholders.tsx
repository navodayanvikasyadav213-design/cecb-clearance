import Layout from "../components/Layout";

const placeholder = (title: string, role: string) => () => (
  <Layout>
    <div className="p-8">
      <div className="bg-pale border border-light rounded-xl p-8 max-w-md">
        <h1 className="text-2xl font-bold text-forest mb-2">{title}</h1>
        <p className="text-gray-500 text-sm">
          Role: <span className="font-medium text-forest">{role}</span>
        </p>
        <p className="text-gray-400 text-xs mt-4">
          Full dashboard coming on Day 4.
        </p>
      </div>
    </div>
  </Layout>
);

export const AdminDashboard    = placeholder("Admin Dashboard",    "ADMIN");
export const ScrutinyDashboard = placeholder("Scrutiny Dashboard", "SCRUTINY");
export const MomDashboard      = placeholder("MoM Dashboard",      "MOM_TEAM");
export const Unauthorized      = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <p className="text-6xl font-bold text-gray-200 mb-4">403</p>
      <p className="text-gray-500 font-medium">Access Denied</p>
      <a href="/login" className="text-forest text-sm hover:underline mt-3 block">
        Back to login
      </a>
    </div>
  </div>
);