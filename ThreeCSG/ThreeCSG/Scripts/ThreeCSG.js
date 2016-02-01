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
"use strict";
var ThreeCSG;
(function (ThreeCSG) {
    var EPSILON = 1e-5;
    var COPLANAR = 0;
    var FRONT = 1;
    var BACK = 2;
    var SPANNING = 3;
    var Vertex = (function () {
        function Vertex(x, y, z, normal, uv) {
            if (normal === void 0) { normal = new THREE.Vector3(); }
            if (uv === void 0) { uv = new THREE.Vector2(); }
            this.x = x;
            this.y = y;
            this.z = z;
            this.normal = normal;
            this.uv = uv;
        }
        Vertex.prototype.interpolate = function (other, t) {
            return this.clone().lerp(other, t);
        };
        Vertex.prototype.applyMatrix4 = function (m) {
            // input: THREE.Matrix4 affine matrix
            var e = m.elements;
            var x = this.x, y = this.y, z = this.z;
            this.x = e[0] * x + e[4] * y + e[8] * z + e[12];
            this.y = e[1] * x + e[5] * y + e[9] * z + e[13];
            this.z = e[2] * x + e[6] * y + e[10] * z + e[14];
            return this;
        };
        Vertex.prototype.clone = function () {
            return new Vertex(this.x, this.y, this.z, this.normal.clone(), this.uv.clone());
        };
        Vertex.prototype.add = function (vertex) {
            this.x += vertex.x;
            this.y += vertex.y;
            this.z += vertex.z;
            return this;
        };
        Vertex.prototype.subtract = function (vertex) {
            this.x -= vertex.x;
            this.y -= vertex.y;
            this.z -= vertex.z;
            return this;
        };
        Vertex.prototype.multiplyScalar = function (scalar) {
            this.x *= scalar;
            this.y *= scalar;
            this.z *= scalar;
            return this;
        };
        Vertex.prototype.cross = function (vertex) {
            var x = this.x, y = this.y, z = this.z;
            this.x = y * vertex.z - z * vertex.y;
            this.y = z * vertex.x - x * vertex.z;
            this.z = x * vertex.y - y * vertex.x;
            return this;
        };
        Vertex.prototype.normalize = function () {
            var length = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
            this.x /= length;
            this.y /= length;
            this.z /= length;
            return this;
        };
        Vertex.prototype.dot = function (vertex) {
            return this.x * vertex.x + this.y * vertex.y + this.z * vertex.z;
        };
        Vertex.prototype.lerp = function (a, t) {
            this.add(a.clone().subtract(this).multiplyScalar(t));
            this.normal.add(a.normal.clone().sub(this.normal).multiplyScalar(t));
            this.uv.add(a.uv.clone().sub(this.uv).multiplyScalar(t));
            return this;
        };
        return Vertex;
    })();
    var Polygon = (function () {
        function Polygon(vertices) {
            if (vertices === void 0) { vertices = []; }
            this.vertices = vertices;
            this.normal = undefined;
            this.w = undefined;
            if (vertices.length > 0)
                this.calculateProperties();
        }
        Polygon.prototype.splitPolygon = function (polygon, coplanar_front, coplanar_back, front, back) {
            var classification = this.classifySide(polygon);
            if (classification === COPLANAR)
                (this.normal.dot(polygon.normal) > 0 ? coplanar_front : coplanar_back).push(polygon);
            else if (classification === FRONT)
                front.push(polygon);
            else if (classification === BACK)
                back.push(polygon);
            else {
                var f = [];
                var b = [];
                for (var i = 0; i < polygon.vertices.length; i++) {
                    var j = (i + 1) % polygon.vertices.length;
                    var vi = polygon.vertices[i];
                    var vj = polygon.vertices[j];
                    var ti = this.classifyVertex(vi);
                    var tj = this.classifyVertex(vj);
                    if (ti != BACK)
                        f.push(vi);
                    if (ti != FRONT)
                        b.push(vi);
                    if ((ti | tj) === SPANNING) {
                        var t = (this.w - this.normal.dot(vi)) / this.normal.dot(vj.clone().subtract(vi));
                        var v = vi.interpolate(vj, t);
                        f.push(v);
                        b.push(v);
                    }
                }
                if (f.length >= 3)
                    front.push(new Polygon(f).calculateProperties());
                if (b.length >= 3)
                    back.push(new Polygon(b).calculateProperties());
            }
        };
        Polygon.prototype.classifySide = function (polygon) {
            var num_positive = 0, num_negative = 0;
            for (var i = 0; i < polygon.vertices.length; i++) {
                var vertex = polygon.vertices[i];
                var classification = this.classifyVertex(vertex);
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
        };
        Polygon.prototype.classifyVertex = function (vertex) {
            var side_value = this.normal.dot(vertex) - this.w;
            if (side_value < -EPSILON)
                return BACK;
            else if (side_value > EPSILON)
                return FRONT;
            else
                return COPLANAR;
        };
        Polygon.prototype.calculateProperties = function () {
            var a = this.vertices[0], b = this.vertices[1], c = this.vertices[2];
            this.normal = b.clone().subtract(a).cross(c.clone().subtract(a)).normalize();
            this.w = this.normal.clone().dot(a);
            return this;
        };
        Polygon.prototype.clone = function () {
            var polygon = new Polygon();
            for (var i = 0; i < this.vertices.length; i++)
                polygon.vertices.push(this.vertices[i].clone());
            polygon.calculateProperties();
            return polygon;
        };
        Polygon.prototype.flip = function () {
            this.normal.multiplyScalar(-1);
            this.w *= -1;
            var vertices = [];
            for (var i = this.vertices.length - 1; i >= 0; i--)
                vertices.push(this.vertices[i]);
            this.vertices = vertices;
            return this;
        };
        return Polygon;
    })();
    var Node = (function () {
        function Node(polys) {
            this.polygons = [];
            this.front = undefined;
            this.back = undefined;
            if (!polys || polys.length === 0)
                return;
            this.divider = polys[0].clone();
            var front = [];
            var back = [];
            for (var i = 0, polygon_count = polys.length; i < polygon_count; i++)
                this.divider.splitPolygon(polys[i], this.polygons, this.polygons, front, back);
            if (front.length > 0)
                this.front = new Node(front);
            if (back.length > 0)
                this.back = new Node(back);
        }
        Node.prototype.clipTo = function (node) {
            this.polygons = node.clipPolygons(this.polygons);
            if (this.front)
                this.front.clipTo(node);
            if (this.back)
                this.back.clipTo(node);
        };
        Node.prototype.clipPolygons = function (polys) {
            if (!this.divider)
                return polys.slice();
            var front = [];
            var back = [];
            for (var i = 0; i < polys.length; i++)
                this.divider.splitPolygon(polys[i], front, back, front, back);
            if (this.front)
                front = this.front.clipPolygons(front);
            if (this.back)
                back = this.back.clipPolygons(back);
            else
                back = [];
            return front.concat(back);
        };
        Node.prototype.invert = function () {
            for (var i = 0; i < this.polygons.length; i++)
                this.polygons[i].flip();
            this.divider.flip();
            if (this.front)
                this.front.invert();
            if (this.back)
                this.back.invert();
            var tmp = this.front;
            this.front = this.back;
            this.back = tmp;
            return this;
        };
        Node.prototype.allPolygons = function () {
            var polygons = this.polygons.slice();
            if (this.front)
                polygons = polygons.concat(this.front.allPolygons());
            if (this.back)
                polygons = polygons.concat(this.back.allPolygons());
            return polygons;
        };
        Node.prototype.clone = function () {
            var node = new Node();
            node.divider = this.divider.clone();
            node.polygons = this.polygons.map(function (p) { return p.clone(); });
            node.front = this.front && this.front.clone();
            node.back = this.back && this.back.clone();
            return node;
        };
        Node.prototype.isConvex = function (polys) {
            for (var i = 0; i < polys.length; i++) {
                for (var j = 0; j < polys.length; j++) {
                    if (i !== j && polys[i].classifySide(polys[j]) !== BACK) {
                        return false;
                    }
                }
            }
            return true;
        };
        Node.prototype.build = function (polys) {
            if (!this.divider)
                this.divider = polys[0].clone();
            var front = [];
            var back = [];
            for (var i = 0; i < polys.length; i++)
                this.divider.splitPolygon(polys[i], this.polygons, this.polygons, front, back);
            if (front.length > 0) {
                if (!this.front)
                    this.front = new Node();
                this.front.build(front);
            }
            if (back.length > 0) {
                if (!this.back)
                    this.back = new Node();
                this.back.build(back);
            }
        };
        return Node;
    })();
    var ThreeBSP = (function () {
        function ThreeBSP(geometry) {
            // Convert THREE.Geometry to ThreeBSP
            var i, _length_i, face, vertex, faceVertexUvs, uvs, polygon, polygons = [], tree;
            if (geometry instanceof THREE.Geometry)
                this.matrix = new THREE.Matrix4;
            else if (geometry instanceof THREE.Mesh) {
                // #todo: add hierarchy support
                geometry.updateMatrix();
                this.matrix = geometry.matrix.clone();
                geometry = geometry.geometry;
            }
            else if (geometry instanceof Node) {
                this.tree = geometry;
                this.matrix = new THREE.Matrix4;
                return this;
            }
            else
                throw 'ThreeBSP: Given geometry is unsupported';
            for (i = 0, _length_i = geometry.faces.length; i < _length_i; i++) {
                face = geometry.faces[i];
                faceVertexUvs = geometry.faceVertexUvs[0][i];
                polygon = new Polygon;
                if (face instanceof THREE.Face3) {
                    vertex = geometry.vertices[face.a];
                    uvs = faceVertexUvs ? new THREE.Vector2(faceVertexUvs[0].x, faceVertexUvs[0].y) : null;
                    vertex = new Vertex(vertex.x, vertex.y, vertex.z, face.vertexNormals[0], uvs);
                    vertex.applyMatrix4(this.matrix);
                    polygon.vertices.push(vertex);
                    vertex = geometry.vertices[face.b];
                    uvs = faceVertexUvs ? new THREE.Vector2(faceVertexUvs[1].x, faceVertexUvs[1].y) : null;
                    vertex = new Vertex(vertex.x, vertex.y, vertex.z, face.vertexNormals[1], uvs);
                    vertex.applyMatrix4(this.matrix);
                    polygon.vertices.push(vertex);
                    vertex = geometry.vertices[face.c];
                    uvs = faceVertexUvs ? new THREE.Vector2(faceVertexUvs[2].x, faceVertexUvs[2].y) : null;
                    vertex = new Vertex(vertex.x, vertex.y, vertex.z, face.vertexNormals[2], uvs);
                    vertex.applyMatrix4(this.matrix);
                    polygon.vertices.push(vertex);
                }
                else
                    throw 'Invalid face type at index ' + i;
                polygon.calculateProperties();
                polygons.push(polygon);
            }
            this.tree = new Node(polygons);
        }
        ThreeBSP.prototype.toMesh = function (material) {
            var geometry = this.toGeometry();
            var mesh = new THREE.Mesh(geometry, material);
            mesh.position.setFromMatrixPosition(this.matrix);
            mesh.rotation.setFromRotationMatrix(this.matrix);
            return mesh;
        };
        ThreeBSP.prototype.subtract = function (other_tree) {
            var a = this.tree.clone();
            var b = other_tree.tree.clone();
            a.invert();
            a.clipTo(b);
            b.clipTo(a);
            b.invert();
            b.clipTo(a);
            b.invert();
            a.build(b.allPolygons());
            a.invert();
            var sub = new ThreeBSP(a);
            sub.matrix = this.matrix;
            return sub;
        };
        ThreeBSP.prototype.union = function (other_tree) {
            var a = this.tree.clone();
            var b = other_tree.tree.clone();
            a.clipTo(b);
            b.clipTo(a);
            b.invert();
            b.clipTo(a);
            b.invert();
            a.build(b.allPolygons());
            var uni = new ThreeBSP(a);
            uni.matrix = this.matrix;
            return uni;
        };
        ThreeBSP.prototype.intersect = function (other_tree) {
            var a = this.tree.clone();
            var b = other_tree.tree.clone();
            a.invert();
            b.clipTo(a);
            b.invert();
            a.clipTo(b);
            b.clipTo(a);
            a.build(b.allPolygons());
            a.invert();
            var inter = new ThreeBSP(a);
            inter.matrix = this.matrix;
            return inter;
        };
        ThreeBSP.prototype.toGeometry = function () {
            var geometry = new THREE.Geometry();
            var polygons = this.tree.allPolygons();
            var matrix = new THREE.Matrix4().getInverse(this.matrix);
            var vertice_dict = {};
            for (var i = 0; i < polygons.length; i++) {
                var polygon = polygons[i];
                for (var j = 2; j < polygon.vertices.length; j++) {
                    var vertex_idx_a = void 0, vertex_idx_b = void 0, vertex_idx_c = void 0;
                    var verticeUvs = [];
                    var vertex = polygon.vertices[0];
                    verticeUvs.push(new THREE.Vector2(vertex.uv.x, vertex.uv.y));
                    var v3 = new THREE.Vector3(vertex.x, vertex.y, vertex.z);
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
                    var face = new THREE.Face3(vertex_idx_a, vertex_idx_b, vertex_idx_c, new THREE.Vector3(polygon.normal.x, polygon.normal.y, polygon.normal.z));
                    geometry.faces.push(face);
                    geometry.faceVertexUvs[0].push(verticeUvs);
                }
            }
            return geometry;
        };
        return ThreeBSP;
    })();
    ThreeCSG.ThreeBSP = ThreeBSP;
})(ThreeCSG || (ThreeCSG = {}));
//# sourceMappingURL=ThreeCSG.js.map