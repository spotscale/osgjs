/*global define */

define( [], function ( osg ) {

    /** -*- compile-command: "jslint-cli Target.js" -*-
     *
     *  Copyright (C) 2010-2011 Cedric Pinson
     *
     *                  GNU LESSER GENERAL PUBLIC LICENSE
     *                      Version 3, 29 June 2007
     *
     * Copyright (C) 2007 Free Software Foundation, Inc. <http://fsf.org/>
     * Everyone is permitted to copy and distribute verbatim copies
     * of this license document, but changing it is not allowed.
     *
     * This version of the GNU Lesser General Public License incorporates
     * the terms and conditions of version 3 of the GNU General Public
     * License
     *
     * Authors:
     *  Cedric Pinson <cedric.pinson@plopbyte.com>
     *
     */

    /** 
     *  Target keep internal data of element to animate, and some function to merge them
     *  @class Target
     */
    Target = function () {
        this._weight = 0;
        this._priorityWeight = 0;
        this._count = 0;
        this._lastPriority = 0;
        this._target = undefined;
    };

// #FIXME blalba osg library class ?

    Target.prototype = {
        reset: function () {
            this._weight = 0;
            this._priorityWeight = 0;
        },
        getValue: function () {
            return this._target;
        }
    };

    return Target;
} );