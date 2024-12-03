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
  constructor() {
    this.prog = InitShaderProgram(meshVS, meshFS);
    this.mvpLoc = gl.getUniformLocation(this.prog, 'mvp');
    this.showTexLoc = gl.getUniformLocation(this.prog, 'showTex');

    this.colorLoc = gl.getUniformLocation(this.prog, 'color');
    this.ambientLoc = gl.getUniformLocation(this.prog, 'ambient');
    this.lightPosLoc = gl.getUniformLocation(this.prog, 'lightPos');
    this.enableLightingLoc = gl.getUniformLocation(this.prog, 'enableLighting');

    this.vertPosLoc = gl.getAttribLocation(this.prog, 'pos');
    this.texCoordLoc = gl.getAttribLocation(this.prog, 'texCoord');
    this.normalLoc = gl.getAttribLocation(this.prog, 'normal');

    this.specularIntensityLoc = gl.getUniformLocation(this.prog, 'specularIntensity');
    this.shininessLoc = gl.getUniformLocation(this.prog, 'shininess');

    // Initial texture values
    this.texture1 = null;
    this.texture2 = null;
    this.secondTextureLoaded = false;
    this.blendFactor = 0.0; // Initial blend factor
    this.tex1Loc = gl.getUniformLocation(this.prog, 'tex1');
    this.tex2Loc = gl.getUniformLocation(this.prog, 'tex2');
    this.blendFactorLoc = gl.getUniformLocation(this.prog, 'blendFactor');

    this.vertbuffer = gl.createBuffer();
    this.texbuffer = gl.createBuffer();
    this.normalBuffer = gl.createBuffer();

    this.numTriangles = 0;

    // Initial light values
    this.lightX = 1.0;
    this.lightY = 1.0;
    this.lightZ = 1.0; // This is fixed, can't be changed by the user, only x and y values of the light can be changed
    this.ambient = 0.5;
    this.specularIntensity = 0.5;
    this.shininess = 16; // This is fixed, can't be changed by the user
    this.lightingEnabled = false;
  }

  setMesh(vertPos, texCoords, normalCoords) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.texbuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalCoords), gl.STATIC_DRAW);

    this.numTriangles = vertPos.length / 3;
  }

  draw(trans) {
    gl.useProgram(this.prog);
    updateLightPos(this);

    gl.uniformMatrix4fv(this.mvpLoc, false, trans);

    const lightPosWorld = [this.lightX, this.lightY, this.lightZ];
    gl.uniform3fv(this.lightPosLoc, lightPosWorld);

    gl.uniform1f(this.ambientLoc, this.ambient);
    gl.uniform1f(this.specularIntensityLoc, this.specularIntensity);
    gl.uniform1f(this.shininessLoc, this.shininess);
    gl.uniform1f(this.blendFactorLoc, this.blendFactor);
    gl.uniform1i(this.enableLightingLoc, this.lightingEnabled);

    // Bind and enable buffers for vertex attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
    gl.enableVertexAttribArray(this.vertPosLoc);
    gl.vertexAttribPointer(this.vertPosLoc, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.texbuffer);
    gl.enableVertexAttribArray(this.texCoordLoc);
    gl.vertexAttribPointer(this.texCoordLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.enableVertexAttribArray(this.normalLoc);
    gl.vertexAttribPointer(this.normalLoc, 3, gl.FLOAT, false, 0, 0);

    // Bind textures
    if (this.texture1) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture1);
      gl.uniform1i(this.tex1Loc, 0);
    }
    if (this.texture2 && this.secondTextureLoaded) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.texture2);
      gl.uniform1i(this.tex2Loc, 1);
    }

    // Set the blend factor
    gl.uniform1f(this.blendFactorLoc, this.blendFactor);

    gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);
  }

  setTexture(img, index) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGB,
      gl.RGB,
      gl.UNSIGNED_BYTE,
      img);

    if (isPowerOf2(img.width) && isPowerOf2(img.height)) {
      gl.generateMipmap(gl.TEXTURE_2D);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }

    gl.useProgram(this.prog);
    gl.activeTexture(gl.TEXTURE0 + index);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    if (index == 0) {
      this.texture1 = texture;
      gl.uniform1i(this.tex1Loc, 0);
    } else if (index == 1) {
      this.texture2 = texture;
      this.secondTextureLoaded = true;
      gl.uniform1i(this.tex2Loc, 1);
    }
  }

  setTextureBlend(factor) {
    if (this.secondTextureLoaded) {
      this.blendFactor = factor;
    } else {
      this.blendFactor = 0.0; // No blending if second texture is not loaded
    }
    gl.useProgram(this.prog);
    gl.uniform1f(this.blendFactorLoc, this.blendFactor);
  }

  showTexture(show) {
    gl.useProgram(this.prog);
    gl.uniform1i(this.showTexLoc, show);
  }

  enableLighting(show) {
    this.lightingEnabled = show;
    gl.useProgram(this.prog);
    gl.uniform1i(this.enableLightingLoc, show);
  }

  setAmbientLight(ambient) {
    gl.useProgram(this.prog);
    this.ambient = ambient;
    gl.uniform1f(this.ambientLoc, this.ambient);
  }

  setSpecularLight(specularIntensity) {
    gl.useProgram(this.prog);
    this.specularIntensity = specularIntensity;
    gl.uniform1f(this.specularIntensityLoc, this.specularIntensity);
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

// Vertex shader source code
const meshVS = `
			attribute vec3 pos; 
			attribute vec2 texCoord; 
			attribute vec3 normal;

			uniform mat4 mvp; 

			varying vec2 v_texCoord; 
			varying vec3 v_normal; 

			void main()
			{
				v_texCoord = texCoord;
				v_normal = normal;

				gl_Position = mvp * vec4(pos,1);
			}`;

// Fragment shader source code
/**
 * @Task2 : You should update the fragment shader to handle the lighting
 */
const meshFS = `
    precision mediump float;

    uniform bool showTex;
    uniform bool enableLighting;
    uniform sampler2D tex1;
    uniform sampler2D tex2;
    uniform vec3 color; 
    uniform vec3 lightPos;
    uniform float ambient;
    uniform float specularIntensity; 
    uniform float shininess;
    uniform float blendFactor;

    varying vec2 v_texCoord;
    varying vec3 v_normal;

    void main()
    {
        vec4 texColor1 = texture2D(tex1, v_texCoord);
        vec4 texColor2 = texture2D(tex2, v_texCoord);
        vec4 texColor = mix(texColor1, texColor2, blendFactor);

        if(showTex && enableLighting){
            vec3 normal = normalize(v_normal);
            vec3 lightDir = normalize(lightPos);
            vec3 lightColor = vec3(1.0, 1.0, 1.0); // White light

            // Calculate diffuse lighting
            float coef = max(dot(normal, lightDir), 0.0);
            vec3 diffuse = coef * lightColor * texColor.rgb;

            // Calculate specular lighting
            vec3 viewDir = normalize(-lightPos); 
            vec3 reflectDir = reflect(-lightDir, normal);
            coef = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
            vec3 specular = specularIntensity * coef * lightColor;

            // Calculate ambient lighting
            vec3 ambientLight = ambient * texColor.rgb;

            vec3 result = diffuse + specular + ambientLight;
            gl_FragColor = vec4(result, texColor.a);
        }
        else if(showTex){
            gl_FragColor = texColor;
        }
        else{
            gl_FragColor =  vec4(1.0, 0, 0, 1.0);
        }
    }`;


const keys = {};
function updateLightPos(meshDrawer) {
  const translationSpeed = 1;
  if (keys['ArrowUp']) meshDrawer.lightY += translationSpeed;
  if (keys['ArrowDown']) meshDrawer.lightY -= translationSpeed;
  if (keys['ArrowRight']) meshDrawer.lightX += translationSpeed;
  if (keys['ArrowLeft']) meshDrawer.lightX -= translationSpeed;
}
///////////////////////////////////////////////////////////////////////////////////