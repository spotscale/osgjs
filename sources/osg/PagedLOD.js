import utils from 'osg/utils';
import Lod from 'osg/Lod';
import NodeVisitor from 'osg/NodeVisitor';
import { mat4 } from 'osg/glMatrix';
import { vec3, vec4 } from 'osg/glMatrix';

/**
 *  PagedLOD that can contains paged child nodes
 *  @class PagedLod
 */
var PagedLOD = function() {
    Lod.call(this);
    this._perRangeDataList = [];
    this._loading = false;
    this._expiryTime = 0.0;
    this._expiryFrame = 0;
    this._centerMode = Lod.USER_DEFINED_CENTER;
    this._frameNumberOfLastTraversal = 0;
    this._databasePath = '';
    this._numChildrenThatCannotBeExpired = 0;
};

/**
 *  PerRangeData utility structure to store per range values
 *  @class PerRangeData
 */
var PerRangeData = function() {
    this.filename = '';
    this.function = undefined;
    this.loaded = false;
    this.timeStamp = 0.0;
    this.frameNumber = 0;
    this.frameNumberOfLastTraversal = 0;
    this.dbrequest = undefined;
};

/** @lends PagedLOD.prototype */
utils.createPrototypeNode(
    PagedLOD,
    utils.objectInherit(Lod.prototype, {
        // Functions here
        setRange: function(childNo, min, max) {
            if (childNo >= this._range.length) {
                var r = [];
                r.push([min, min]);
                this._range.push(r);
            }
            this._range[childNo][0] = min;
            this._range[childNo][1] = max;
        },

        setExpiryTime: function(expiryTime) {
            this._expiryTime = expiryTime;
        },

        setDatabasePath: function(path) {
            this._databasePath = path;
        },

        getDatabasePath: function() {
            return this._databasePath;
        },

        setFileName: function(childNo, filename) {
            // May we should expand the vector first?
            if (childNo >= this._perRangeDataList.length) {
                var rd = new PerRangeData();
                rd.filename = filename;
                this._perRangeDataList.push(rd);
            } else {
                this._perRangeDataList[childNo].filename = filename;
            }
        },
        setFunction: function(childNo, func) {
            if (childNo >= this._perRangeDataList.length) {
                var rd = new PerRangeData();
                rd.function = func;
                this._perRangeDataList.push(rd);
            } else {
                this._perRangeDataList[childNo].function = func;
            }
        },

        addChild: function(node, min, max) {
            Lod.prototype.addChild.call(this, node, min, max);
            this._perRangeDataList.push(new PerRangeData());
        },

        addChildNode: function(node) {
            Lod.prototype.addChildNode.call(this, node);
        },

        setFrameNumberOfLastTraversal: function(frameNumber) {
            this._frameNumberOfLastTraversal = frameNumber;
        },

        getFrameNumberOfLastTraversal: function() {
            return this._frameNumberOfLastTraversal;
        },
        setTimeStamp: function(childNo, timeStamp) {
            this._perRangeDataList[childNo].timeStamp = timeStamp;
        },
        setFrameNumber: function(childNo, frameNumber) {
            this._perRangeDataList[childNo].frameNumber = frameNumber;
        },
        setNumChildrenThatCannotBeExpired: function(num) {
            this._numChildrenThatCannotBeExpired = num;
        },
        getNumChildrenThatCannotBeExpired: function() {
            return this._numChildrenThatCannotBeExpired;
        },
        getDatabaseRequest: function(childNo) {
            return this._perRangeDataList[childNo].dbrequest;
        },
        removeExpiredChildren: function(expiryTime, expiryFrame, removedChildren) {
            if (this.children.length <= this._numChildrenThatCannotBeExpired) return;
            var i = this.children.length - 1;
            var timed, framed;
            timed = this._perRangeDataList[i].timeStamp + this._expiryTime;
            framed = this._perRangeDataList[i].frameNumber + this._expiryFrame;
            if (
                timed < expiryTime &&
                framed < expiryFrame &&
                (this._perRangeDataList[i].filename.length > 0 ||
                    this._perRangeDataList[i].function !== undefined)
            ) {
                removedChildren.push(this.children[i]);
                this.removeChild(this.children[i]);
                this._perRangeDataList[i].loaded = false;
                if (this._perRangeDataList[i].dbrequest !== undefined) {
                    this._perRangeDataList[i].dbrequest._groupExpired = true;
                }
            }
        },

        computePixelSizeVector: (function() {
            var scale00 = vec3.create();
            var scale10 = vec3.create();
            return function(W, P, M) {
                // Where W = viewport, P = ProjectionMatrix, M = ModelViewMatrix
                // Comment from OSG:
                // pre adjust P00,P20,P23,P33 by multiplying them by the viewport window matrix.
                // here we do it in short hand with the knowledge of how the window matrix is formed
                // note P23,P33 are multiplied by an implicit 1 which would come from the window matrix.

                // scaling for horizontal pixels
                var P00 = P[0] * W.width() * 0.5;
                var P20_00 = P[8] * W.width() * 0.5 + P[11] * W.width() * 0.5;
                vec3.set(
                    scale00,
                    M[0] * P00 + M[2] * P20_00,
                    M[4] * P00 + M[6] * P20_00,
                    M[8] * P00 + M[10] * P20_00
                );

                // scaling for vertical pixels
                var P10 = P[5] * W.height() * 0.5;
                var P20_10 = P[9] * W.height() * 0.5 + P[11] * W.height() * 0.5;
                vec3.set(
                    scale10,
                    M[1] * P10 + M[2] * P20_10,
                    M[5] * P10 + M[6] * P20_10,
                    M[9] * P10 + M[10] * P20_10
                );

                var P23 = P[11];
                var P33 = P[15];
                var pixelSizeVector = vec4.fromValues(
                    M[2] * P23,
                    M[6] * P23,
                    M[10] * P23,
                    M[14] * P23 + M[15] * P33
                );

                var scaleRatio =
                    0.7071067811 / Math.sqrt(vec3.sqrLen(scale00) + vec3.sqrLen(scale10));
                vec4.scale(pixelSizeVector, pixelSizeVector, scaleRatio);
                return pixelSizeVector;
            };
        })(),
        
        pixelSize: function(bound, viewport, projMatrix, viewMatrix) {
            const center3 = bound.center();
            const center4 = vec4.fromValues(center3[0], center3[1], center3[2], 1.0);
            return bound.radius() / vec4.dot(center4, this.computePixelSizeVector(viewport, projMatrix, viewMatrix));
        },
        
        clampedPixelSize: function(bound, viewport, projMatrix, viewMatrix) {
            return Math.abs(this.pixelSize(bound, viewport, projMatrix, viewMatrix));
        },
        
        traverse: (function() {
            // avoid to generate variable on the heap to limit garbage collection
            // instead create variable and use the same each time
            var zeroVector = vec3.create();
            var eye = vec3.create();
            var viewModel = mat4.create();

            return function(visitor) {
                var traversalMode = visitor.traversalMode;
                var updateTimeStamp = false;

                if (visitor.getVisitorType() === NodeVisitor.CULL_VISITOR) {
                    this._frameNumberOfLastTraversal = visitor.getFrameStamp().getFrameNumber();
                    updateTimeStamp = true;
                }

                switch (traversalMode) {
                    case NodeVisitor.TRAVERSE_ALL_CHILDREN:
                        for (var index = 0; index < this.children.length; index++) {
                            this.children[index].accept(visitor);
                        }
                        break;

                    case NodeVisitor.TRAVERSE_ACTIVE_CHILDREN:
                        var requiredRange = 0, distance = 0;

                        // Calculate distance from viewpoint
                        var matrix = visitor.getCurrentModelViewMatrix();
                        mat4.invert(viewModel, matrix);
                        vec3.transformMat4(eye, zeroVector, viewModel);
                        distance = vec3.distance(this.getBound().center(), eye);
                        
                        if (this._rangeMode === Lod.DISTANCE_FROM_EYE_POINT) {
                            requiredRange = distance * visitor.getLODScale();
                        } else {
                            // SPOTSCALE: To avoid distorted bounding spheres near edges of screen resulting in
                            // larger pixel area than bounding sphere straight ahead, use radius-based calculation from OSG instead:
                            requiredRange = this.clampedPixelSize(this.getBound(), visitor.getViewport(), visitor.getCurrentProjectionMatrix(), visitor.getCurrentModelViewMatrix()) / visitor.getLODScale();
                            // Square pixels as before
                            requiredRange = Math.pow(requiredRange, 2.0);
                            
                            /*
                            // Calculate pixels on screen
                            var projmatrix = visitor.getCurrentProjectionMatrix();
                            // focal length is the value stored in projmatrix[0]
                            requiredRange = this.projectBoundingSphere(
                                this.getBound(),
                                matrix,
                                projmatrix[0]
                            );
                            // Get the real area value and apply LODScale
                            requiredRange =
                                requiredRange *
                                visitor.getViewport().width() *
                                visitor.getViewport().width() *
                                0.25 /
                                visitor.getLODScale();
                            */
                            
                            if (requiredRange < 0)
                                requiredRange = this._range[this._range.length - 1][0];
                        }

                        var needToLoadChild = false;
                        var lastChildTraversed = -1;
                        for (var j = 0; j < this._range.length; ++j) {
                            if (
                                this._range[j][0] <= requiredRange &&
                                requiredRange < this._range[j][1]
                            ) {
                                if (j < this.children.length) {
                                    if (updateTimeStamp) {
                                        this._perRangeDataList[
                                            j
                                        ].timeStamp = visitor.getFrameStamp().getSimulationTime();
                                        this._perRangeDataList[
                                            j
                                        ].frameNumber = visitor.getFrameStamp().getFrameNumber();
                                    }

                                    this.children[j].accept(visitor);
                                    lastChildTraversed = j;
                                } else {
                                    needToLoadChild = true;
                                }
                            }
                        }
                        if (needToLoadChild) {
                            var numChildren = this.children.length;
                            if (numChildren > 0 && numChildren - 1 !== lastChildTraversed) {
                                if (updateTimeStamp) {
                                    this._perRangeDataList[
                                        numChildren - 1
                                    ].timeStamp = visitor.getFrameStamp().getSimulationTime();
                                    this._perRangeDataList[
                                        numChildren - 1
                                    ].frameNumber = visitor.getFrameStamp().getFrameNumber();
                                }

                                this.children[numChildren - 1].accept(visitor);
                            }
                            // now request the loading of the next unloaded child.
                            if (numChildren < this._perRangeDataList.length) {
                                // compute priority from where abouts in the required range the distance falls.
                                var priority =
                                    (this._range[numChildren][0] - requiredRange) /
                                    (this._range[numChildren][1] - this._range[numChildren][0]);
                                if (this._rangeMode === Lod.PIXEL_SIZE_ON_SCREEN) {
                                    priority = -priority;
                                }
                                // Here we do the request
                                var group = visitor.nodePath[visitor.nodePath.length - 1];
                                if (this._perRangeDataList[numChildren].loaded === false) {
                                    this._perRangeDataList[numChildren].loaded = true;
                                    var dbhandler = visitor.getDatabaseRequestHandler();
                                    this._perRangeDataList[
                                        numChildren
                                    ].dbrequest = dbhandler.requestNodeFile(
                                        this._perRangeDataList[numChildren].function,
                                        this._databasePath +
                                            this._perRangeDataList[numChildren].filename,
                                        group,
                                        visitor.getFrameStamp().getSimulationTime(),
                                        priority,
                                        visitor.nodePath.length,
                                        requiredRange,
                                        distance
                                    );
                                } else {
                                    // Update timestamp of the request.
                                    if (
                                        this._perRangeDataList[numChildren].dbrequest !== undefined
                                    ) {
                                        this._perRangeDataList[numChildren].dbrequest._timeStamp = visitor.getFrameStamp().getSimulationTime();
                                        this._perRangeDataList[numChildren].dbrequest._priority = priority;
                                        this._perRangeDataList[numChildren].dbrequest._depth = visitor.nodePath.length;
                                        this._perRangeDataList[numChildren].dbrequest._requiredRange = requiredRange;
                                        this._perRangeDataList[numChildren].dbrequest._distance = distance;
                                    } else {
                                        // The DB request is undefined, so the DBPager was not accepting requests, we need to ask for the child again.
                                        this._perRangeDataList[numChildren].loaded = false;
                                    }
                                }
                            }
                        }
                        break;
                    default:
                        break;
                }
            };
        })()
    }),
    'osg',
    'PagedLOD'
);

export default PagedLOD;
