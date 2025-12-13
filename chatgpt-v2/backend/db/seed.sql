-- Demo seed. Replace hashes for production.
INSERT INTO users (email, password_hash, display_name, role)
VALUES
 ('admin@example.com', '$2a$10$wH0G8u/9y9kQy2gGdQxJfO5XkM4Oq2o6b7UoY2m9QhHj0yXwOeV6y', 'Admin', 'superadmin'),
 ('owner@example.com', '$2a$10$wH0G8u/9y9kQy2gGdQxJfO5XkM4Oq2o6b7UoY2m9QhHj0yXwOeV6y', 'Owner', 'user'),
 ('user2@example.com', '$2a$10$wH0G8u/9y9kQy2gGdQxJfO5XkM4Oq2o6b7UoY2m9QhHj0yXwOeV6y', 'User2', 'user')
ON CONFLICT (email) DO NOTHING;
