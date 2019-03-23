CREATE TABLE nags ( id serial PRIMARY KEY, name varchar(1024) NOT NULL, interval interval NOT NULL, next timestamp NOT NULL );
