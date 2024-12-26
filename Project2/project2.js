/**
 * @Instructions
 * 		@task1 : Complete the setTexture function to handle non power of 2 sized textures
 * 		@task2 : Implement the lighting by modifying the fragment shader, constructor,
 *      @task3: 
 *      @task4: 
 * 		setMesh, draw, setAmbientLight, setSpecularLight and enableLighting functions 
 */

function GetModelViewProjection(projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY) {
	
	var trans1 = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];
	var rotatXCos = Math.cos(rotationX);
	var rotatXSin = Math.sin(rotationX);

	var rotatYCos = Math.cos(rotationY);
	var rotatYSin = Math.sin(rotationY);

	var rotatx = [
		1, 0, 0, 0,
		0, rotatXCos, -rotatXSin, 0,
		0, rotatXSin, rotatXCos, 0,
		0, 0, 0, 1
	]

	var rotaty = [
		rotatYCos, 0, -rotatYSin, 0,
		0, 1, 0, 0,
		rotatYSin, 0, rotatYCos, 0,
		0, 0, 0, 1
	]

	var test1 = MatrixMult(rotaty, rotatx);
	var test2 = MatrixMult(trans1, test1);
	var mvp = MatrixMult(projectionMatrix, test2);

	return mvp;
}


class MeshDrawer {
	// The constructor is a good place for taking care of the necessary initializations.
	constructor() {
		this.prog = InitShaderProgram(meshVS, meshFS);
		this.mvpLoc = gl.getUniformLocation(this.prog, 'mvp');
		this.showTexLoc = gl.getUniformLocation(this.prog, 'showTex');
		this.colorLoc = gl.getUniformLocation(this.prog, 'color');
		this.vertPosLoc = gl.getAttribLocation(this.prog, 'pos');
		this.texCoordLoc = gl.getAttribLocation(this.prog, 'texCoord');
		this.vertbuffer = gl.createBuffer();
		this.texbuffer = gl.createBuffer();
		this.numTriangles = 0;
		
		this.lightPos = gl.getUniformLocation(this.prog, 'lightPos');
		this.ambientLightLoc = gl.getUniformLocation(this.prog, 'ambient');
		this.enableLoc = gl.getUniformLocation(this.prog, 'enableLighting');
		
		this.fixedPos = [0.0, 0.0, -10.0];

		this.nBuffer = gl.createBuffer();
		this.normalLoc = gl.getAttribLocation(this.prog, 'normal');

		this.lightEnabled = false;
		this.ambientLight = 0.1;
		this.specIntLoc = gl.getUniformLocation(this.prog, 'specInt');
		this.viewPosLoc = gl.getUniformLocation(this.prog, 'viewPos');
		this.modelLoc = gl.getUniformLocation(this.prog, 'modelM');
		this.specInt = 0.5;
		this.nMatrixLoc = gl.getUniformLocation(this.prog, 'normalM');
		this.textures = [];
		this.textureUnits = [gl.TEXTURE0, gl.TEXTURE1];
		this.textLoc = [];
		this.numTextLocation = gl.getUniformLocation(this.prog, 'numTextures');
		for (let i = 0; i < 2; i++) {
			this.textLoc.push(gl.getUniformLocation(this.prog, `tex${i}`));
		}
	}

	setMesh(vertPos, texCoords, normalCoords) {
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

		
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

		
		gl.bindBuffer(gl.ARRAY_BUFFER, this.nBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalCoords), gl.STATIC_DRAW);

		this.numTriangles = vertPos.length / 3;
	}

	// This method is called to draw the triangular mesh.
	// The argument is the transformation matrix, the same matrix returned
	// by the GetModelViewProjection function above.
	draw(trans) {
		gl.useProgram(this.prog);

		gl.uniformMatrix4fv(this.mvpLoc, false, trans);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
		gl.enableVertexAttribArray(this.vertPosLoc);
		gl.vertexAttribPointer(this.vertPosLoc, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.texbuffer);
		gl.enableVertexAttribArray(this.texCoordLoc);
		gl.vertexAttribPointer(this.texCoordLoc, 2, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.nBuffer);
		gl.enableVertexAttribArray(this.normalLoc);
		gl.vertexAttribPointer(this.normalLoc, 3, gl.FLOAT, false, 0, 0);
		gl.uniform3fv(this.lightPos, this.fixedPos);
		gl.uniform1f(this.ambientLightLoc, this.ambientLight);
		gl.uniform1i(this.enableLoc, this.lightEnabled);
		gl.uniform1f(this.specIntLoc, this.specInt);
		gl.uniform3f(this.viewPosLoc, 0, 0, -transZ);

		const modelM = [
			trans[0], trans[1], trans[2], 0,
			trans[4], trans[5], trans[6], 0,
			trans[8], trans[9], trans[10], 0,
			0, 0, 0, 1
		];
		gl.uniformMatrix4fv(this.modelLoc, false, modelM);
		
		const normalM = [
			modelM[0], modelM[1], modelM[2],
			modelM[4], modelM[5], modelM[6],
			modelM[8], modelM[9], modelM[10]
		];
		gl.uniformMatrix3fv(this.nMatrixLoc, false, normalM);

		for (let i = 0; i < this.textures.length; i++) {
			gl.activeTexture(this.textureUnits[i]);
			gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
		}
		gl.uniform1i(this.numTextLocation, this.textures.length);
		moveLight();
		gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);
	}

	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture(img, index = 0) {
		if (index >= this.textureUnits.length) {
			console.error('Maximum number of textures reached');
			return;
		}
		const texture = gl.createTexture();
		gl.activeTexture(this.textureUnits[index]);
		gl.bindTexture(gl.TEXTURE_2D, texture);

		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGB,
			gl.RGB,
			gl.UNSIGNED_BYTE,
			img
		);

		if (isPowerOf2(img.width) && isPowerOf2(img.height)) {
			gl.generateMipmap(gl.TEXTURE_2D);
		} else {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		}

		this.textures[index] = texture;

		gl.useProgram(this.prog);
		gl.uniform1i(this.textLoc[index], index);
		gl.uniform1i(this.numTextLocation, this.textures.length);
	}

	
	removeTexture(index) {
		if (index < this.textures.length) {
			gl.deleteTexture(this.textures[index]);
			this.textures.splice(index, 1);
			gl.useProgram(this.prog);
			gl.uniform1i(this.numTextLocation, this.textures.length);
		}
	}

	showTexture(show) {
		gl.useProgram(this.prog);
		gl.uniform1i(this.showTexLoc, show);
	}

	enableLighting(show) {
		this.lightEnabled = show;
	}
	
	setAmbientLight(ambient) {
		this.ambientLight = ambient;
	}

	setSpecularLight(intensity) {
		this.specInt = intensity;
	}
}

const keys = {};
function moveLight() {
	const speed = 1;
	if (keys['ArrowUp']) lightY += speed;
	if (keys['ArrowDown']) lightY -= speed;
	if (keys['ArrowRight']) lightX += speed;
	if (keys['ArrowLeft']) lightX -= speed;

	meshDrawer.fixedPos = [lightX, lightY, -10.0];
}


const meshVS = `
			attribute vec3 pos; 
			attribute vec2 texCoord; 
			attribute vec3 normal;

			uniform mat4 mvp; 
			uniform mat4 modelM;
			uniform mat3 normalM;

			varying vec2 v_texCoord; 
			varying vec3 v_normal; 
			varying vec3 v_fragPos;
			varying mat3 v_normalM;

			void main()
			{
				v_texCoord = texCoord;
				v_normal = normalize(normalM * normal);
				v_fragPos = vec3(modelM * vec4(pos, 1.0));
				v_normalM = normalM;

				gl_Position = mvp * vec4(pos,1);
			}`;

const meshFS = `
	precision mediump float;
	
	uniform bool showTex;
	uniform bool enableLighting;
	uniform sampler2D tex0;
	uniform sampler2D tex1;
	uniform int numTextures;
	uniform vec3 color; 
	uniform vec3 lightPos;
	uniform float ambient;
	uniform float specInt;
	uniform vec3 viewPos;
	varying mat3 v_normalM;
	varying vec2 v_texCoord;
	varying vec3 v_normal;
	varying vec3 v_fragPos;

	void main()
	{
		vec4 texColor = texture2D(tex0, v_texCoord);
		vec3 N = normalize(v_normal);
		
		if (numTextures > 1) {
			// Get normal from normal map
			vec3 normalMap = texture2D(tex1, v_texCoord).rgb * 2.0 - 1.0;

			// Create TBN matrix
            vec3 T = normalize(vec3(1.0, 0.0, 0.0));
            vec3 B = normalize(cross(N, T));
            T = normalize(cross(B, N));
            mat3 TBN = mat3(T, B, N);
            
            // Transform normal from tangent to world space
            N = normalize(TBN * normalMap);
		}
		vec3 lightDir = normalize(lightPos - v_fragPos);
		vec3 viewDir = normalize(viewPos - v_fragPos);
		
		float diff = max(dot(N, lightDir), 0.0);
		vec3 diffuse = diff * vec3(1.0, 1.0, 1.0);
		
		vec3 reflectDir = reflect(-lightDir, N);
		float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
		vec3 specular = specInt * spec * vec3(1.0, 1.0, 1.0);
		vec3 lighting = ambient + diffuse + specular;
		
		if (showTex && enableLighting) {
			gl_FragColor = vec4(texColor.rgb * lighting, texColor.a);
		} else if (showTex) {
			gl_FragColor = texColor;
		} else {
			gl_FragColor = vec4(color * lighting, 1.0);
		}
	}`;

// Light direction parameters for Task 2
var lightX = 1;
var lightY = 1;

function SetSpecularLight(param) {
    meshDrawer.setSpecularLight(param.value / 100);
    DrawScene();
}

function uploadTexture(event, index) {
	const file = event.target.files[0];
	if (file) {
		const reader = new FileReader();
		reader.onload = function(e) {
			const img = new Image();
			img.onload = function() {
				meshDrawer.setTexture(img, index);
				DrawScene();			
			}
			img.src = e.target.result;
		};
		reader.readAsDataURL(file);
	}
}

function isPowerOf2(value) {
	return (value & (value - 1)) == 0;
}

function normalize(v, dst) {
	dst = dst || new Float32Array(3);
	var length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
	// make sure we don't divide by 0.
	if (length > 0.00001) {
		dst[0] = v[0] / length;
		dst[1] = v[1] / length;
		dst[2] = v[2] / length;
	}
	return dst;
}

///////////////////////////////////////////////////////////////////////////////////