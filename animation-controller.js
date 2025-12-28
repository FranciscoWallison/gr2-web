(function(exports) {

	/**
	 * Animation States
	 */
	var AnimationState = {
		IDLE: 0,      // Stop/Parado
		MOVE: 1,      // Moveout - Caminhando/Correndo
		ATTACK: 2,    // Attackout - Atacando
		DAMAGE: 3,    // Damageout - Recebendo dano
		DEAD: 4       // Deadout - Morrendo
	};

	/**
	 * Animation Controller for Granny2 models
	 * Manages animation states: IDLE, MOVE, ATTACK, DAMAGE, DEAD
	 */
	function AnimationController(granny2, modelPtr, skeletonPtr, boneCount) {
		this.granny2 = granny2;
		this.runtime = granny2.runtime;

		// Model pointers
		this.modelPtr = modelPtr;
		this.skeletonPtr = skeletonPtr;
		this.boneCount = boneCount || 0;
		this.modelInstance = null;
		this.worldPose = null;

		// Current state
		this.currentState = AnimationState.IDLE;
		this.previousState = AnimationState.IDLE;
		this.currentAnimation = null;
		this.animationControl = null;

		// Animation cache (state -> animation config)
		this.animations = {};

		// Timing
		this.localClock = 0;
		this.speed = 1.0;
		this.weight = 1.0;
		this.looping = true;

		// Callbacks
		this.onAnimationEnd = null;
		this.onStateChange = null;
		this._onCompleteCallback = null;

		// Initialize
		this._init();
	}

	var proto = AnimationController.prototype;

	/**
	 * Initialize the controller
	 */
	proto._init = function() {
		// Instantiate model
		this.modelInstance = this.granny2.InstantiateModel(this.modelPtr);

		// Get bone count from skeleton if not provided
		if (!this.boneCount && this.skeletonPtr) {
			var skeleton = Granny2.readStructure(
				this.runtime.cpu,
				this.skeletonPtr,
				Granny2.structs.granny_skeleton
			);
			this.boneCount = skeleton.BoneCount;
		}

		// Create world pose
		if (this.boneCount > 0) {
			this.worldPose = this.granny2.NewWorldPose(this.boneCount);
		}

		console.log('[AnimController] Initialized with ' + this.boneCount + ' bones');
	};

	/**
	 * Register an animation for a specific state
	 * @param state Animation state (AnimationState.IDLE, etc)
	 * @param animationPtr Pointer to granny_animation structure
	 * @param options Configuration options { loop, speed, blendTime, priority }
	 */
	proto.registerAnimation = function(state, animationPtr, options) {
		options = options || {};

		this.animations[state] = {
			ptr: animationPtr,
			loop: options.loop !== undefined ? options.loop : true,
			speed: options.speed || 1.0,
			blendTime: options.blendTime || 0.2,
			priority: options.priority !== undefined ? options.priority : state
		};

		console.log('[AnimController] Registered animation for state ' + state);
	};

	/**
	 * Register animation by name matching
	 * @param animName Animation name from file
	 * @param animPtr Animation pointer
	 * @param duration Animation duration
	 */
	proto.registerAnimationByName = function(animName, animPtr, duration) {
		var name = animName.toLowerCase();

		// Map animation names to states
		var stateMap = {
			'idle': AnimationState.IDLE,
			'wait': AnimationState.IDLE,
			'stand': AnimationState.IDLE,
			'stop': AnimationState.IDLE,
			'walk': AnimationState.MOVE,
			'run': AnimationState.MOVE,
			'move': AnimationState.MOVE,
			'attack': AnimationState.ATTACK,
			'atk': AnimationState.ATTACK,
			'attack1': AnimationState.ATTACK,
			'attack01': AnimationState.ATTACK,
			'damage': AnimationState.DAMAGE,
			'hit': AnimationState.DAMAGE,
			'hurt': AnimationState.DAMAGE,
			'death': AnimationState.DEAD,
			'die': AnimationState.DEAD,
			'dead': AnimationState.DEAD
		};

		for (var keyword in stateMap) {
			if (name.indexOf(keyword) !== -1) {
				var state = stateMap[keyword];
				var isLooping = (state === AnimationState.IDLE || state === AnimationState.MOVE);

				this.registerAnimation(state, animPtr, {
					loop: isLooping,
					speed: 1.0
				});

				console.log('[AnimController] Auto-registered: ' + animName + ' -> State ' + state);
				return true;
			}
		}

		return false;
	};

	/**
	 * Set idle/stop animation
	 */
	proto.stop = function() {
		this._transitionTo(AnimationState.IDLE);
	};

	/**
	 * Set movement animation
	 * @param speed Optional speed multiplier
	 */
	proto.moveout = function(speed) {
		var anim = this.animations[AnimationState.MOVE];
		if (anim) {
			anim.speed = speed || 1.0;
		}
		this._transitionTo(AnimationState.MOVE);
	};

	/**
	 * Set attack animation
	 * @param onComplete Optional callback when attack ends
	 */
	proto.attackout = function(onComplete) {
		var self = this;
		this._transitionTo(AnimationState.ATTACK, {
			loop: false,
			onComplete: function() {
				if (onComplete) onComplete();
				self.stop();
			}
		});
	};

	/**
	 * Set damage animation
	 * @param onComplete Optional callback when damage ends
	 */
	proto.damageout = function(onComplete) {
		var self = this;
		this._transitionTo(AnimationState.DAMAGE, {
			loop: false,
			onComplete: function() {
				if (onComplete) onComplete();
				self.stop();
			}
		});
	};

	/**
	 * Set death animation
	 * @param onComplete Optional callback when death animation ends
	 */
	proto.deadout = function(onComplete) {
		this._transitionTo(AnimationState.DEAD, {
			loop: false,
			onComplete: onComplete
		});
	};

	/**
	 * Internal state transition
	 */
	proto._transitionTo = function(newState, overrides) {
		overrides = overrides || {};

		var anim = this.animations[newState];
		if (!anim) {
			console.warn('[AnimController] No animation registered for state ' + newState);
			return false;
		}

		var prevState = this.currentState;
		this.previousState = prevState;
		this.currentState = newState;

		// Free previous control
		if (this.animationControl) {
			this._freeControl();
		}

		// Configure new animation
		var loop = overrides.loop !== undefined ? overrides.loop : anim.loop;
		var speed = overrides.speed || anim.speed;

		// Play new animation
		this.animationControl = this._playControlledAnimation(
			anim.ptr,
			loop,
			speed,
			anim.blendTime
		);

		this.currentAnimation = anim;
		this._onCompleteCallback = overrides.onComplete;

		// State change callback
		if (this.onStateChange) {
			this.onStateChange(prevState, newState);
		}

		console.log('[AnimController] State: ' + prevState + ' -> ' + newState);
		return true;
	};

	/**
	 * Play a controlled animation
	 */
	proto._playControlledAnimation = function(animPtr, loop, speed, blendTime) {
		// Use PlayControlledAnimation
		var control = this.granny2.PlayControlledAnimation(
			0, // startTime
			animPtr,
			this.modelInstance
		);

		if (control) {
			// Set speed
			this.granny2.SetControlSpeed(control, speed);

			// Set loop count
			if (loop) {
				this.granny2.SetControlLoopCount(control, 0); // 0 = infinite
			} else {
				this.granny2.SetControlLoopCount(control, 1);
			}

			// Set blend/ease
			if (blendTime > 0) {
				this.granny2.EaseControlIn(control, blendTime);
			}
		}

		return control;
	};

	/**
	 * Free current control
	 */
	proto._freeControl = function() {
		if (this.animationControl) {
			this.granny2.FreeControl(this.animationControl);
			this.animationControl = null;
		}
	};

	/**
	 * Update animation (call each frame)
	 * @param deltaTime Time since last frame in seconds
	 * @returns Float32Array Array of bone matrices or null
	 */
	proto.update = function(deltaTime) {
		if (!this.animationControl || !this.modelInstance) {
			return null;
		}

		this.localClock += deltaTime * this.speed;

		// Update model clock
		this.granny2.SetModelClock(this.modelInstance, this.localClock);

		// Check if animation complete
		if (this._checkAnimationComplete()) {
			if (this._onCompleteCallback) {
				var callback = this._onCompleteCallback;
				this._onCompleteCallback = null;
				callback();
			}
			if (this.onAnimationEnd) {
				this.onAnimationEnd(this.currentState);
			}
		}

		// Sample animations
		this.granny2.SampleModelAnimations(
			this.modelInstance,
			0, // LocalPoseCount
			0, // LocalPoses
			this.worldPose
		);

		// Build world pose
		var skeleton = this.granny2.GetSourceSkeleton(this.modelInstance);
		this.granny2.BuildWorldPose(
			skeleton,
			0, // firstBone
			this.boneCount,
			0, // LocalPose (null = use from model)
			0, // Offset4x4 (null = identity)
			this.worldPose
		);

		// Get matrices
		return this._getWorldPoseMatrices();
	};

	/**
	 * Check if current animation is complete
	 */
	proto._checkAnimationComplete = function() {
		if (!this.animationControl) return false;
		return this.granny2.ControlIsComplete(this.animationControl);
	};

	/**
	 * Get world pose matrices
	 */
	proto._getWorldPoseMatrices = function() {
		if (!this.worldPose || this.boneCount <= 0) {
			return null;
		}

		return this.granny2.GetWorldPoseMatrices(this.worldPose, this.boneCount);
	};

	/**
	 * Get current state
	 */
	proto.getState = function() {
		return this.currentState;
	};

	/**
	 * Check if in specific state
	 */
	proto.isState = function(state) {
		return this.currentState === state;
	};

	/**
	 * Check if dead
	 */
	proto.isDead = function() {
		return this.currentState === AnimationState.DEAD;
	};

	/**
	 * Get animation control clock
	 */
	proto.getAnimationTime = function() {
		if (this.animationControl) {
			return this.granny2.GetControlClock(this.animationControl);
		}
		return 0;
	};

	/**
	 * Get animation duration
	 */
	proto.getAnimationDuration = function() {
		if (this.animationControl) {
			return this.granny2.GetControlDuration(this.animationControl);
		}
		return 0;
	};

	/**
	 * Get animation progress (0-1)
	 */
	proto.getAnimationProgress = function() {
		var duration = this.getAnimationDuration();
		if (duration > 0) {
			return Math.min(1, this.getAnimationTime() / duration);
		}
		return 0;
	};

	/**
	 * Set animation speed
	 */
	proto.setSpeed = function(speed) {
		this.speed = speed;
		if (this.animationControl) {
			this.granny2.SetControlSpeed(this.animationControl, speed);
		}
	};

	/**
	 * Get animation speed
	 */
	proto.getSpeed = function() {
		return this.speed;
	};

	/**
	 * Pause animation
	 */
	proto.pause = function() {
		if (this.animationControl) {
			this.granny2.SetControlActive(this.animationControl, false);
		}
	};

	/**
	 * Resume animation
	 */
	proto.resume = function() {
		if (this.animationControl) {
			this.granny2.SetControlActive(this.animationControl, true);
		}
	};

	/**
	 * Check if paused
	 */
	proto.isPaused = function() {
		if (this.animationControl) {
			return !this.granny2.ControlIsActive(this.animationControl);
		}
		return true;
	};

	/**
	 * Dispose and free resources
	 */
	proto.dispose = function() {
		this._freeControl();

		if (this.worldPose) {
			this.granny2.FreeWorldPose(this.worldPose);
			this.worldPose = null;
		}

		if (this.modelInstance) {
			this.granny2.FreeModelInstance(this.modelInstance);
			this.modelInstance = null;
		}

		this.animations = {};
		console.log('[AnimController] Disposed');
	};

	// ============================================
	// CharacterEntity - High-level character wrapper
	// ============================================

	/**
	 * Character Entity for game integration
	 */
	function CharacterEntity(granny2) {
		this.granny2 = granny2;
		this.animController = null;
		this.meshes = [];
		this.meshDeformers = [];
		this.meshBindings = [];
		this.position = { x: 0, y: 0, z: 0 };
		this.rotation = 0;
		this.scale = 1.0;
		this.isLoaded = false;
		this.fileInfo = null;
	}

	var entityProto = CharacterEntity.prototype;

	/**
	 * Load character from GR2 buffer
	 * @param gr2Buffer ArrayBuffer containing GR2 file
	 * @param animBuffer Optional ArrayBuffer with separate animations
	 */
	entityProto.load = function(gr2Buffer, animBuffer) {
		var gr2 = this.granny2;

		console.log('[CharacterEntity] Loading GR2 file (' + gr2Buffer.byteLength + ' bytes)...');

		// Load model file
		var grannyFile = gr2.ReadEntireFileFromMemory(gr2Buffer);
		console.log('[CharacterEntity] ReadEntireFileFromMemory returned:', grannyFile ? '0x' + grannyFile.toString(16) : 'null');

		if (!grannyFile) {
			throw new Error('Failed to read GR2 file from memory');
		}

		var fileInfoPtr = gr2.GetFileInfo(grannyFile);
		console.log('[CharacterEntity] GetFileInfo returned:', fileInfoPtr ? '0x' + fileInfoPtr.toString(16) : 'null');

		if (!fileInfoPtr) {
			throw new Error('Failed to get file info');
		}

		var fileInfo = Granny2.readStructure(gr2.runtime.cpu, fileInfoPtr, Granny2.structs.granny_file_info);

		this.fileInfo = fileInfo;
		this.fileInfoPtr = fileInfoPtr;
		this.grannyFile = grannyFile;

		console.log('[CharacterEntity] === File Info ===');
		console.log('[CharacterEntity] FromFileName:', fileInfo.FromFileName);
		console.log('[CharacterEntity] Models:', fileInfo.ModelCount);
		console.log('[CharacterEntity] Meshes:', fileInfo.MeshCount);
		console.log('[CharacterEntity] Skeletons:', fileInfo.SkeletonCount);
		console.log('[CharacterEntity] Textures:', fileInfo.TextureCount);
		console.log('[CharacterEntity] Materials:', fileInfo.MaterialCount);
		console.log('[CharacterEntity] Animations:', fileInfo.AnimationCount);
		console.log('[CharacterEntity] TrackGroups:', fileInfo.TrackGroupCount);

		if (fileInfo.ModelCount === 0) {
			throw new Error('No models in GR2 file');
		}

		// Get first model
		var model = fileInfo.Models[0];
		console.log('[CharacterEntity] Model[0]:', model.Name, 'ptr:', '0x' + model._ptr.toString(16));
		console.log('[CharacterEntity] Model Skeleton ptr:', model.Skeleton ? '0x' + model.Skeleton.toString(16) : 'null');
		console.log('[CharacterEntity] Model MeshBindingsCount:', model.MeshBindingsCount);

		var skeletonPtr = model.Skeleton;
		var skeleton = fileInfo.Skeletons.length > 0 ? fileInfo.Skeletons[0] : null;
		var boneCount = skeleton ? skeleton.BoneCount : 0;

		console.log('[CharacterEntity] Skeleton:', skeleton ? skeleton.Name : 'none', 'Bones:', boneCount);

		// Create animation controller
		this.animController = new AnimationController(
			gr2,
			model._ptr,
			skeletonPtr,
			boneCount
		);

		// Extract meshes - use the Meshes array from fileInfo directly
		// OBS: Model.MeshBindings não está batendo com FileInfo.Meshes (parser trata como array de ponteiros).
		// Pra renderizar, usa direto a lista de meshes do arquivo.
		console.log('[CharacterEntity] Extracting meshes...');

		for (var i = 0; i < fileInfo.MeshCount; i++) {
			var mesh = fileInfo.Meshes[i];
			var meshPtr = mesh._ptr;

			console.log('[CharacterEntity] Processing Mesh[' + i + ']:', mesh.Name, 'ptr:', '0x' + meshPtr.toString(16));

			try {
				// Get mesh data
				var vertexCount = gr2.GetMeshVertexCount(meshPtr);
				var indexCount = gr2.GetMeshIndexCount(meshPtr);

				console.log('[CharacterEntity]   Vertices:', vertexCount, 'Indices:', indexCount);

				if (vertexCount === 0) {
					console.warn('[CharacterEntity]   Skipping mesh with 0 vertices');
					continue;
				}

				var vertices = gr2.CopyMeshVertices(meshPtr);
				var indices = gr2.CopyMeshIndices(meshPtr);

				console.log('[CharacterEntity]   Copied', vertices.length, 'bytes vertices,', indices.length, 'bytes indices');

				var vertexType = gr2.GetMeshVertexType(meshPtr);
				console.log('[CharacterEntity]   VertexType:', '0x' + vertexType.toString(16));

				// Create mesh deformer for skinning (may fail for rigid meshes)
				var deformer = null;
				var binding = null;

				try {
					var isRigid = gr2.MeshIsRigid(meshPtr);
					console.log('[CharacterEntity]   IsRigid:', isRigid);

					if (!isRigid && skeletonPtr) {
						deformer = gr2.NewMeshDeformer(vertexType);
						binding = gr2.NewMeshBinding(meshPtr, skeletonPtr, skeletonPtr);
						console.log('[CharacterEntity]   Deformer:', '0x' + (deformer || 0).toString(16), 'Binding:', '0x' + (binding || 0).toString(16));
					}
				} catch (e) {
					console.warn('[CharacterEntity]   Could not create deformer/binding:', e.message);
				}

				this.meshes.push({
					ptr: meshPtr,
					name: mesh.Name,
					vertices: vertices,
					indices: indices,
					vertexCount: vertexCount,
					indexCount: indexCount,
					deformedVertices: new Uint8Array(vertices.length)
				});

				this.meshDeformers.push(deformer);
				this.meshBindings.push(binding);

				console.log('[CharacterEntity]   Mesh added successfully');

			} catch (e) {
				console.error('[CharacterEntity]   Error processing mesh:', e.message);
			}
		}

		console.log('[CharacterEntity] Extracted', this.meshes.length, 'meshes');

		if (this.meshes.length === 0) {
			throw new Error('Nenhuma mesh extraída (verifique parsing de FileInfo.Meshes)');
		}

		// Load animations from model file
		this._loadAnimations(fileInfoPtr);

		// Load animations from separate file if provided
		if (animBuffer) {
			console.log('[CharacterEntity] Loading separate animation file...');
			var animGrannyFile = gr2.ReadEntireFileFromMemory(animBuffer);
			var animFileInfoPtr = gr2.GetFileInfo(animGrannyFile);
			this._loadAnimations(animFileInfoPtr);
		}

		// Setup callbacks
		var self = this;
		this.animController.onStateChange = function(from, to) {
			console.log('[CharacterEntity] State:', from, '->', to);
		};

		this.animController.onAnimationEnd = function(state) {
			console.log('[CharacterEntity] Animation ended:', state);
		};

		// Start in idle if we have an idle animation
		if (this.animController.animations[AnimationState.IDLE]) {
			this.animController.stop();
		}

		this.isLoaded = true;
		console.log('[CharacterEntity] === Load Complete ===');
		console.log('[CharacterEntity] Meshes:', this.meshes.length);
		console.log('[CharacterEntity] Animations registered:', Object.keys(this.animController.animations).length);
	};

	/**
	 * Load animations from file info
	 */
	entityProto._loadAnimations = function(fileInfoPtr) {
		console.log('[CharacterEntity] Loading animations from file info:', '0x' + fileInfoPtr.toString(16));

		var fileInfo = Granny2.readStructure(
			this.granny2.runtime.cpu,
			fileInfoPtr,
			Granny2.structs.granny_file_info
		);

		console.log('[CharacterEntity] AnimationCount:', fileInfo.AnimationCount);
		console.log('[CharacterEntity] Animations ptr:', fileInfo.Animations ? '0x' + fileInfo.Animations.toString(16) : 'null');

		if (fileInfo.AnimationCount === 0 || !fileInfo.Animations) {
			console.log('[CharacterEntity] No animations in this file');
			return;
		}

		var animations = [];

		for (var i = 0; i < fileInfo.AnimationCount; i++) {
			try {
				var animPtr = this.granny2.runtime.get_dword_ptr(fileInfo.Animations + i * 4);
				console.log('[CharacterEntity] Animation[' + i + '] ptr:', animPtr ? '0x' + animPtr.toString(16) : 'null');

				if (animPtr) {
					var animStruct = Granny2.readStructure(
						this.granny2.runtime.cpu,
						animPtr,
						Granny2.structs.granny_animation
					);

					console.log('[CharacterEntity]   Name:', animStruct.Name);
					console.log('[CharacterEntity]   Duration:', animStruct.Duration.toFixed(3) + 's');
					console.log('[CharacterEntity]   TrackGroupCount:', animStruct.TrackGroupCount);

					var registered = this.animController.registerAnimationByName(
						animStruct.Name,
						animPtr,
						animStruct.Duration
					);

					animations.push({
						ptr: animPtr,
						name: animStruct.Name,
						duration: animStruct.Duration,
						registered: registered
					});
				}
			} catch (e) {
				console.error('[CharacterEntity] Error reading animation ' + i + ':', e.message);
			}
		}

		console.log('[CharacterEntity] Processed', animations.length, 'animations');
		console.log('[CharacterEntity] Registered states:', Object.keys(this.animController.animations));
	};

	// Character control methods

	entityProto.stop = function() {
		if (this.animController) {
			this.animController.stop();
		}
	};

	entityProto.move = function(direction, speed) {
		if (!this.isLoaded) return;
		speed = speed || 1.0;

		// Update position
		this.position.x += direction.x * speed * 0.1;
		this.position.z += direction.z * speed * 0.1;

		// Update rotation based on direction
		if (direction.x !== 0 || direction.z !== 0) {
			this.rotation = Math.atan2(direction.x, direction.z);
		}

		this.animController.moveout(speed);
	};

	entityProto.attack = function(onHit) {
		if (!this.isLoaded) return;
		if (this.animController.isState(AnimationState.ATTACK)) return;
		if (this.animController.isDead()) return;

		this.animController.attackout(function() {
			console.log('[CharacterEntity] Attack complete');
		});

		// Schedule hit callback
		if (onHit) {
			setTimeout(onHit, 300);
		}
	};

	entityProto.takeDamage = function(amount) {
		if (!this.isLoaded) return;
		if (this.animController.isDead()) return;

		this.animController.damageout(function() {
			console.log('[CharacterEntity] Damage animation complete');
		});
	};

	entityProto.die = function() {
		if (!this.isLoaded) return;

		this.animController.deadout(function() {
			console.log('[CharacterEntity] Death animation complete');
		});
	};

	/**
	 * Update character (call each frame)
	 * @param deltaTime Time since last frame in seconds
	 * @returns Object { position, rotation, boneMatrices }
	 */
	entityProto.update = function(deltaTime) {
		if (!this.isLoaded) return null;

		var boneMatrices = this.animController.update(deltaTime);

		return {
			position: this.position,
			rotation: this.rotation,
			scale: this.scale,
			boneMatrices: boneMatrices
		};
	};

	/**
	 * Get deformed vertices for a mesh
	 * @param meshIndex Mesh index
	 * @returns Uint8Array Deformed vertex data
	 */
	entityProto.getDeformedVertices = function(meshIndex) {
		if (!this.isLoaded || meshIndex >= this.meshes.length) {
			return null;
		}

		var mesh = this.meshes[meshIndex];
		var deformer = this.meshDeformers[meshIndex];

		if (!deformer || !this.animController.worldPose) {
			return mesh.vertices;
		}

		// Allocate buffers
		var srcPtr = this.granny2.runtime.allocator.alloc(mesh.vertices.length);
		var dstPtr = this.granny2.runtime.allocator.alloc(mesh.vertices.length);

		// Copy source vertices
		this.granny2.runtime.copy_to_mem(srcPtr, mesh.vertices);

		// Deform vertices
		this.granny2.DeformVertices(
			deformer,
			this.animController.worldPose,
			mesh.vertexCount,
			srcPtr,
			dstPtr
		);

		// Copy result
		this.granny2.runtime.copy_from_mem(dstPtr, mesh.deformedVertices);

		// Free buffers
		this.granny2.runtime.allocator.free(srcPtr);
		this.granny2.runtime.allocator.free(dstPtr);

		return mesh.deformedVertices;
	};

	/**
	 * Dispose and free resources
	 */
	entityProto.dispose = function() {
		if (this.animController) {
			this.animController.dispose();
			this.animController = null;
		}

		this.meshes = [];
		this.meshDeformers = [];
		this.meshBindings = [];
		this.isLoaded = false;

		console.log('[CharacterEntity] Disposed');
	};

	// Export classes
	exports.AnimationController = AnimationController;
	exports.AnimationState = AnimationState;
	exports.CharacterEntity = CharacterEntity;

})(this);
