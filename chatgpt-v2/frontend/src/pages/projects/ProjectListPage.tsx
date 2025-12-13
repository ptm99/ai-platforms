import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiListProjects, Project } from '../../api/project.api';

const ProjectListPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiListProjects();
        setProjects(data);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) return <div>Loading projects…</div>;

  return (
    <div>
      <h1>Projects</h1>
      {projects.length === 0 ? (
        <p>No projects yet.</p>
      ) : (
        <ul>
          {projects.map((p) => (
            <li key={p.id}>
              <Link to={`/projects/${p.id}`}>{p.title}</Link> ({p.visibility})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ProjectListPage;
