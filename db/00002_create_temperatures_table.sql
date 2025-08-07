CREATE TABLE temperatures ( id serial PRIMARY KEY, date timestamp NOT NULL, high integer NOT NULL, low integer NOT NULL );
ALTER TABLE temperatures ADD CONSTRAINT unique_date UNIQUE (date)
