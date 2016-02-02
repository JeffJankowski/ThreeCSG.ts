//
//    Conversion of ThreeCSG JavaScript library to TypeScript. The goal is to refactor to more
//    idiomatic object-oriented code in the process, which is why I decided on a port instead of 
//    a simple definition file.
//
//    Typescript repository:  
//    Original repository:    https://github.com/chandlerprall/ThreeCSG
//    
//    Authors: Jeff Jankowski, chandlerprall
//    Date:    February 2016
//

"use strict"
module ThreeCSG {

    const EPSILON: number = 1e-5;
    const COPLANAR: number = 0;
    const FRONT: number = 1;
    const BACK: number = 2;
    const SPANNING: number = 3;

    class Vertex {

        constructor(public x: number, public y: number, public z: number,
            public normal = new THREE.Vector3(), public uv = new THREE.Vector2()) { }

        interpolate(other, t) {
            return this.clone().lerp(other, t);
        }

        applyMatrix4(m: THREE.Matrix4) {
            // input: THREE.Matrix4 affine matrix
            let e = m.elements;
            let x = this.x, y = this.y, z = this.z;
            this.x = e[0] * x + e[4] * y + e[8] * z + e[12];
            this.y = e[1] * x + e[5] * y + e[9] * z + e[13];
            this.z = e[2] * x + e[6] * y + e[10] * z + e[14];
            return this;
        }

        clone() {
            return new Vertex(this.x, this.y, this.z, this.normal.clone(), this.uv.clone());
        }

        add(vertex: Vertex) {
            this.x += vertex.x;
            this.y += vertex.y;
            this.z += vertex.z;
            return this;
        }

        subtract(vertex: Vertex) {
            this.x -= vertex.x;
            this.y -= vertex.y;
            this.z -= vertex.z;
            return this;
        }

        multiplyScalar(scalar: number) {
            this.x *= scalar;
            this.y *= scalar;
            this.z *= scalar;
            return this;
        }

        cross(vertex: Vertex) {
            let x = this.x, y = this.y, z = this.z;
            this.x = y * vertex.z - z * vertex.y;
            this.y = z * vertex.x - x * vertex.z;
            this.z = x * vertex.y - y * vertex.x;

            return this;
        }

        normalize() {
            let length = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);

            this.x /= length;
            this.y /= length;
            this.z /= length;

            return this;
        }

        dot(vertex: Vertex) {
            return this.x * vertex.x + this.y * vertex.y + this.z * vertex.z;
        }

        lerp(a: Vertex, t: number) {
            this.add(a.clone().subtract(this).multiplyScalar(t));
            this.normal.add(a.normal.clone().sub(this.normal).multiplyScalar(t));
            this.uv.add(a.uv.clone().sub(this.uv).multiplyScalar(t));

            return this;
        }
    }


    class Polygon {
        public normal: Vertex = undefined;
        private w: number = undefined;

        constructor(public vertices: Vertex[] = []) {
            if (vertices.length > 0)
                this.calculateProperties();
        }

        splitPolygon(polygon: Polygon, coplanar_front: Polygon[], coplanar_back: Polygon[],
            front: Polygon[], back: Polygon[]) {
            let classification = this.classifySide(polygon);

            if (classification === COPLANAR)
                (this.normal.dot(polygon.normal) > 0 ? coplanar_front : coplanar_back).push(polygon);
            else if (classification === FRONT)
                front.push(polygon);
            else if (classification === BACK)
                back.push(polygon);
            else {
                let f: Vertex[] = [];
                let b: Vertex[] = [];
                for (let i = 0; i < polygon.vertices.length; i++) {
                    let j = (i + 1) % polygon.vertices.length;
                    let vi = polygon.vertices[i];
                    let vj = polygon.vertices[j];
                    let ti = this.classifyVertex(vi);
                    let tj = this.classifyVertex(vj);

                    if (ti != BACK)
                        f.push(vi);
                    if (ti != FRONT)
                        b.push(vi);
                    if ((ti | tj) === SPANNING) {
                        let t = (this.w - this.normal.dot(vi)) / this.normal.dot(vj.clone().subtract(vi));
                        let v = vi.interpolate(vj, t);
                        f.push(v);
                        b.push(v);
                    }
                }

                if (f.length >= 3)
                    front.push(new Polygon(f).calculateProperties());
                if (b.length >= 3)
                    back.push(new Polygon(b).calculateProperties());
            }
        }

        classifySide(polygon) {
            let num_positive = 0, num_negative = 0;
            for (let i = 0; i < polygon.vertices.length; i++) {
                let vertex = polygon.vertices[i];
                let classification = this.classifyVertex(vertex);
                if (classification === FRONT)
                    num_positive++;
                else if (classification === BACK)
                    num_negative++;
            }

            if (num_positive > 0 && num_negative === 0)
                return FRONT;
            else if (num_positive === 0 && num_negative > 0)
                return BACK;
            else if (num_positive === 0 && num_negative === 0)
                return COPLANAR;
            else
                return SPANNING;
        }

        classifyVertex(vertex: Vertex) {
            let side_value = this.normal.dot(vertex) - this.w;
            if (side_value < -EPSILON)
                return BACK;
            else if (side_value > EPSILON)
                return FRONT;
            else
                return COPLANAR;
        }

        calculateProperties() {
            let a = this.vertices[0], b = this.vertices[1], c = this.vertices[2];

            this.normal = b.clone().subtract(a).cross(c.clone().subtract(a)).normalize();
            this.w = this.normal.clone().dot(a);

            return this;
        }

        clone() {
            let polygon = new Polygon();
            for (let i = 0; i < this.vertices.length; i++)
                polygon.vertices.push(this.vertices[i].clone());

            polygon.calculateProperties();
            return polygon;
        }

        flip() {
            this.normal.multiplyScalar(-1);
            this.w *= -1;

            let vertices: Vertex[] = [];
            for (let i = this.vertices.length - 1; i >= 0; i--)
                vertices.push(this.vertices[i]);
            this.vertices = vertices;

            return this;
        }
    }


    class Node {
        private polygons: Polygon[] = [];
        private front: Node = undefined;
        private back: Node = undefined;
        private divider: Polygon;
        
        constructor(polys?: Polygon[]) {
            if (!polys || polys.length === 0) 
                return;
            this.divider = polys[0].clone();

            let front: Polygon[] = [];
            let back: Polygon[] = [];
            for (let i = 0, polygon_count = polys.length; i < polygon_count; i++)
                this.divider.splitPolygon(polys[i], this.polygons, this.polygons, front, back);  

            if (front.length > 0)
                this.front = new Node(front);
            if (back.length > 0)
                this.back = new Node(back);
        }

        clipTo(node) {
            this.polygons = node.clipPolygons(this.polygons);
            if (this.front)
                this.front.clipTo(node);
            if (this.back)
                this.back.clipTo(node);
        }

        clipPolygons(polys) {
            if (!this.divider)
                return polys.slice();

            let front: Polygon[] = [];
            let back: Polygon[] = [];

            for (let i = 0; i < polys.length; i++)
                this.divider.splitPolygon(polys[i], front, back, front, back);

            if (this.front)
                front = this.front.clipPolygons(front);
            if (this.back)
                back = this.back.clipPolygons(back);
            else
                back = [];

            return front.concat(back);
        }

        invert() {
            for (let i = 0; i < this.polygons.length; i++)
                this.polygons[i].flip();

            this.divider.flip();
            if (this.front)
                this.front.invert();
            if (this.back)
                this.back.invert();

            let tmp = this.front;
            this.front = this.back;
            this.back = tmp;

            return this;
        }

        allPolygons() {
            let polygons = this.polygons.slice();
            if (this.front)
                polygons = polygons.concat(this.front.allPolygons());
            if (this.back)
                polygons = polygons.concat(this.back.allPolygons());

            return polygons;
        }

        clone() {
            let node = new Node();
            node.divider = this.divider.clone();
            node.polygons = this.polygons.map(p => p.clone());
            node.front = this.front && this.front.clone();
            node.back = this.back && this.back.clone();

            return node;
        }

        isConvex(polys) {
            for (let i = 0; i < polys.length; i++) {
                for (let j = 0; j < polys.length; j++) {
                    if (i !== j && polys[i].classifySide(polys[j]) !== BACK) {
                        return false;
                    }
                }
            }
            return true;
        }

        build(polys) {
            if (!this.divider)
                this.divider = polys[0].clone();

            let front: Polygon[] = [];
            let back: Polygon[] = [];

            for (let i = 0; i < polys.length; i++)
                this.divider.splitPolygon(polys[i], this.polygons, this.polygons, front, back);

            if (front.length > 0) {
                if (!this.front) this.front = new Node();
                this.front.build(front);
            }

            if (back.length > 0) {
                if (!this.back) this.back = new Node();
                this.back.build(back);
            }
        }
    
    }


    export class ThreeBSP {
        private matrix: THREE.Matrix4;
        private tree: Node;

        constructor(input: THREE.Geometry);
        constructor(input: THREE.Mesh);
        constructor(input: Node);
        constructor(input: any) {
            // Convert THREE.Geometry to ThreeBSP
            let geometry: THREE.Geometry;
            if (input instanceof THREE.Geometry)
            {
                this.matrix = new THREE.Matrix4;
                geometry = input;
            }
            else if (input instanceof THREE.Mesh) {
                // #todo: add hierarchy support
                let mesh: THREE.Mesh = input;
                mesh.updateMatrix();
                this.matrix = mesh.matrix.clone();
                geometry = <THREE.Geometry> mesh.geometry;
            } else if (input instanceof Node) {
                this.tree = input;
                this.matrix = new THREE.Matrix4;
                return this;
            } else
                throw 'ThreeBSP: Given input is unsupported';

            let polygons: Polygon[] = [];
            for (let i = 0; i < geometry.faces.length; i++) {
                let face = geometry.faces[i];
                let faceVertexUvs = geometry.faceVertexUvs[0][i];
                let polygon = new Polygon;

                if (face instanceof THREE.Face3) {
                    let v3 = geometry.vertices[face.a];
                    let uvs = faceVertexUvs ? new THREE.Vector2(faceVertexUvs[0].x, faceVertexUvs[0].y) : null;
                    let vertex = new Vertex(v3.x, v3.y, v3.z, face.vertexNormals[0], uvs);
                    vertex.applyMatrix4(this.matrix);
                    polygon.vertices.push(vertex);

                    v3 = geometry.vertices[face.b];
                    uvs = faceVertexUvs ? new THREE.Vector2(faceVertexUvs[1].x, faceVertexUvs[1].y) : null;
                    vertex = new Vertex(v3.x, v3.y, v3.z, face.vertexNormals[1], uvs);
                    vertex.applyMatrix4(this.matrix);
                    polygon.vertices.push(vertex);

                    v3 = geometry.vertices[face.c];
                    uvs = faceVertexUvs ? new THREE.Vector2(faceVertexUvs[2].x, faceVertexUvs[2].y) : null;
                    vertex = new Vertex(v3.x, v3.y, v3.z, face.vertexNormals[2], uvs);
                    vertex.applyMatrix4(this.matrix);
                    polygon.vertices.push(vertex);
                } else
                    throw 'Invalid face type at index ' + i;

                polygon.calculateProperties();
                polygons.push(polygon);
            }

            this.tree = new Node(polygons);
        }

        toMesh(material: THREE.Material) {
            let geometry = this.toGeometry();
            let mesh = new THREE.Mesh(geometry, material);

            mesh.position.setFromMatrixPosition(this.matrix);
            mesh.rotation.setFromRotationMatrix(this.matrix);

            return mesh;
        }

        subtract(other_tree: ThreeBSP) {
            let a = this.tree.clone();
            let b = other_tree.tree.clone();

            a.invert();
            a.clipTo(b);
            b.clipTo(a);
            b.invert();
            b.clipTo(a);
            b.invert();
            a.build(b.allPolygons());
            a.invert();

            let sub = new ThreeBSP(a);
            sub.matrix = this.matrix;
            return sub;
        }

        union(other_tree: ThreeBSP) {
            let a = this.tree.clone();
            let b = other_tree.tree.clone();

            a.clipTo(b);
            b.clipTo(a);
            b.invert();
            b.clipTo(a);
            b.invert();
            a.build(b.allPolygons());

            let uni = new ThreeBSP(a);
            uni.matrix = this.matrix;
            return uni;
        }

        intersect(other_tree: ThreeBSP) {
            let a = this.tree.clone();
            let b = other_tree.tree.clone();

            a.invert();
            b.clipTo(a);
            b.invert();
            a.clipTo(b);
            b.clipTo(a);
            a.build(b.allPolygons());
            a.invert();

            let inter = new ThreeBSP(a);
            inter.matrix = this.matrix;
            return inter;
        }

        toGeometry() {
            let geometry = new THREE.Geometry();
            let polygons = this.tree.allPolygons();
            let matrix = new THREE.Matrix4().getInverse(this.matrix);
            let vertice_dict: { [id: string]: number } = {};

            for (let i = 0; i < polygons.length; i++) {
                let polygon = polygons[i];

                for (let j = 2; j < polygon.vertices.length; j++) {
                    let vertex_idx_a: number, vertex_idx_b: number, vertex_idx_c: number;

                    let verticeUvs: THREE.Vector2[] = [];
                    let vertex = polygon.vertices[0];
                    verticeUvs.push(new THREE.Vector2(vertex.uv.x, vertex.uv.y));
                    let v3 = new THREE.Vector3(vertex.x, vertex.y, vertex.z);
                    v3.applyMatrix4(matrix);
                    if (typeof vertice_dict[v3.x + ',' + v3.y + ',' + v3.z] !== 'undefined')
                        vertex_idx_a = vertice_dict[v3.x + ',' + v3.y + ',' + v3.z];
                    else {
                        geometry.vertices.push(v3);
                        vertex_idx_a = vertice_dict[v3.x + ',' + v3.y + ',' + v3.z] = geometry.vertices.length - 1;
                    }

                    vertex = polygon.vertices[j - 1];
                    verticeUvs.push(new THREE.Vector2(vertex.uv.x, vertex.uv.y));
                    v3 = new THREE.Vector3(vertex.x, vertex.y, vertex.z);
                    v3.applyMatrix4(matrix);
                    if (typeof vertice_dict[v3.x + ',' + v3.y + ',' + v3.z] !== 'undefined')
                        vertex_idx_b = vertice_dict[v3.x + ',' + v3.y + ',' + v3.z];
                    else {
                        geometry.vertices.push(v3);
                        vertex_idx_b = vertice_dict[v3.x + ',' + v3.y + ',' + v3.z] = geometry.vertices.length - 1;
                    }

                    vertex = polygon.vertices[j];
                    verticeUvs.push(new THREE.Vector2(vertex.uv.x, vertex.uv.y));
                    v3 = new THREE.Vector3(vertex.x, vertex.y, vertex.z);
                    v3.applyMatrix4(matrix);
                    if (typeof vertice_dict[v3.x + ',' + v3.y + ',' + v3.z] !== 'undefined')
                        vertex_idx_c = vertice_dict[v3.x + ',' + v3.y + ',' + v3.z];
                    else {
                        geometry.vertices.push(v3);
                        vertex_idx_c = vertice_dict[v3.x + ',' + v3.y + ',' + v3.z] = geometry.vertices.length - 1;
                    }

                    let face = new THREE.Face3(vertex_idx_a, vertex_idx_b, vertex_idx_c, new
                        THREE.Vector3(polygon.normal.x, polygon.normal.y, polygon.normal.z));
                    geometry.faces.push(face);
                    geometry.faceVertexUvs[0].push(verticeUvs);
                }

            }
            return geometry;
        }
    }

}